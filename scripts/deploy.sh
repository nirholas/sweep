#!/bin/bash
# ============================================
# Piggy Bank - Deployment Script
# ============================================
# Usage: ./scripts/deploy.sh [environment] [version]
# Example: ./scripts/deploy.sh production v1.2.3
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
VERSION="${2:-latest}"
NAMESPACE="piggybank"
REGISTRY="ghcr.io/nirholas/piggy-bank"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first."
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install it first."
    fi
    
    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not configured or cluster is not accessible."
    fi
    
    log_success "Prerequisites check passed"
}

# Validate environment
validate_environment() {
    log_info "Validating environment: ${ENVIRONMENT}"
    
    case $ENVIRONMENT in
        staging|production)
            log_success "Environment '${ENVIRONMENT}' is valid"
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}. Use 'staging' or 'production'"
            ;;
    esac
}

# Build Docker images
build_images() {
    log_info "Building Docker images for version ${VERSION}..."
    
    # Build API image
    log_info "Building API image..."
    docker build -t "${REGISTRY}-api:${VERSION}" -f Dockerfile .
    
    # Build Workers image
    log_info "Building Workers image..."
    docker build -t "${REGISTRY}-workers:${VERSION}" -f Dockerfile.workers .
    
    log_success "Docker images built successfully"
}

# Push Docker images
push_images() {
    log_info "Pushing Docker images to registry..."
    
    docker push "${REGISTRY}-api:${VERSION}"
    docker push "${REGISTRY}-workers:${VERSION}"
    
    # Also tag and push as latest if not already latest
    if [ "$VERSION" != "latest" ]; then
        docker tag "${REGISTRY}-api:${VERSION}" "${REGISTRY}-api:latest"
        docker tag "${REGISTRY}-workers:${VERSION}" "${REGISTRY}-workers:latest"
        docker push "${REGISTRY}-api:latest"
        docker push "${REGISTRY}-workers:latest"
    fi
    
    log_success "Docker images pushed successfully"
}

# Update Kubernetes manifests with version
update_manifests() {
    log_info "Updating Kubernetes manifests with version ${VERSION}..."
    
    # Update API deployment
    sed -i "s|image:.*piggy-bank-api.*|image: ${REGISTRY}-api:${VERSION}|g" k8s/api-deployment.yaml
    
    # Update Workers deployment
    sed -i "s|image:.*piggy-bank-workers.*|image: ${REGISTRY}-workers:${VERSION}|g" k8s/workers-deployment.yaml
    
    log_success "Manifests updated"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes namespace: ${NAMESPACE}..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply ConfigMaps and Secrets first
    log_info "Applying ConfigMaps and Secrets..."
    kubectl apply -f k8s/configmap.yaml -n ${NAMESPACE}
    
    # Note: Secrets should be applied separately with actual values
    log_warning "Remember to apply secrets with actual values!"
    
    # Deploy databases
    log_info "Deploying PostgreSQL..."
    kubectl apply -f k8s/postgres-deployment.yaml -n ${NAMESPACE}
    
    log_info "Deploying Redis..."
    kubectl apply -f k8s/redis-deployment.yaml -n ${NAMESPACE}
    
    # Wait for databases to be ready
    log_info "Waiting for databases to be ready..."
    kubectl rollout status statefulset/postgres -n ${NAMESPACE} --timeout=120s || true
    kubectl rollout status statefulset/redis -n ${NAMESPACE} --timeout=60s || true
    
    # Deploy application
    log_info "Deploying API..."
    kubectl apply -f k8s/api-deployment.yaml -n ${NAMESPACE}
    kubectl apply -f k8s/api-service.yaml -n ${NAMESPACE}
    kubectl apply -f k8s/api-ingress.yaml -n ${NAMESPACE}
    
    log_info "Deploying Workers..."
    kubectl apply -f k8s/workers-deployment.yaml -n ${NAMESPACE}
    
    # Apply HPA
    log_info "Applying Horizontal Pod Autoscaler..."
    kubectl apply -f k8s/hpa.yaml -n ${NAMESPACE}
    
    log_success "Kubernetes resources applied"
}

# Wait for rollout
wait_for_rollout() {
    log_info "Waiting for deployment rollout..."
    
    kubectl rollout status deployment/piggybank-api -n ${NAMESPACE} --timeout=300s
    kubectl rollout status deployment/piggybank-workers -n ${NAMESPACE} --timeout=300s
    
    log_success "Rollout completed successfully"
}

# Run health checks
health_check() {
    log_info "Running health checks..."
    
    # Get API pod
    API_POD=$(kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/component=api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$API_POD" ]; then
        log_warning "No API pods found for health check"
        return
    fi
    
    # Check health endpoint
    HEALTH_STATUS=$(kubectl exec -n ${NAMESPACE} ${API_POD} -- wget -q -O - http://localhost:3000/health/live 2>/dev/null || echo "failed")
    
    if [[ $HEALTH_STATUS == *"ok"* ]] || [[ $HEALTH_STATUS == *"healthy"* ]]; then
        log_success "Health check passed"
    else
        log_warning "Health check returned: ${HEALTH_STATUS}"
    fi
}

# Print deployment summary
print_summary() {
    echo ""
    echo "============================================"
    echo "        Deployment Summary"
    echo "============================================"
    echo "Environment: ${ENVIRONMENT}"
    echo "Version:     ${VERSION}"
    echo "Namespace:   ${NAMESPACE}"
    echo "============================================"
    echo ""
    
    log_info "Pod Status:"
    kubectl get pods -n ${NAMESPACE}
    
    echo ""
    log_info "Services:"
    kubectl get services -n ${NAMESPACE}
    
    echo ""
    log_info "Ingress:"
    kubectl get ingress -n ${NAMESPACE}
    
    echo ""
    log_success "Deployment completed!"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    kubectl rollout undo deployment/piggybank-api -n ${NAMESPACE}
    kubectl rollout undo deployment/piggybank-workers -n ${NAMESPACE}
    
    log_info "Waiting for rollback..."
    kubectl rollout status deployment/piggybank-api -n ${NAMESPACE} --timeout=120s
    kubectl rollout status deployment/piggybank-workers -n ${NAMESPACE} --timeout=120s
    
    log_success "Rollback completed"
}

# Main execution
main() {
    echo ""
    echo "============================================"
    echo "    Piggy Bank Deployment Script"
    echo "============================================"
    echo ""
    
    check_prerequisites
    validate_environment
    
    # Ask for confirmation in production
    if [ "$ENVIRONMENT" == "production" ]; then
        echo ""
        log_warning "You are deploying to PRODUCTION!"
        read -p "Are you sure you want to continue? (yes/no): " CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Optional: Build and push images
    read -p "Build and push Docker images? (yes/no): " BUILD_IMAGES
    if [ "$BUILD_IMAGES" == "yes" ]; then
        build_images
        push_images
    fi
    
    update_manifests
    deploy_kubernetes
    wait_for_rollout
    health_check
    print_summary
}

# Handle script arguments
case "${1:-}" in
    rollback)
        rollback
        ;;
    *)
        main
        ;;
esac
