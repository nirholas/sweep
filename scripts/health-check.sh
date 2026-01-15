#!/bin/bash
# ============================================
# Piggy Bank - Kubernetes Health Check Script
# ============================================
# This script is used by Kubernetes probes and
# can also be run manually for debugging.
# ============================================

set -euo pipefail

# Configuration
PORT="${PORT:-3000}"
HOST="${HOST:-localhost}"
TIMEOUT="${TIMEOUT:-5}"

# Health endpoints
LIVE_ENDPOINT="/health/live"
READY_ENDPOINT="/health/ready"

# Check type (live or ready)
CHECK_TYPE="${1:-live}"

# Function to perform health check
health_check() {
    local endpoint=$1
    local url="http://${HOST}:${PORT}${endpoint}"
    
    # Use wget (available in Alpine) or curl
    if command -v wget &> /dev/null; then
        response=$(wget -q -T "${TIMEOUT}" -O - "${url}" 2>/dev/null)
        exit_code=$?
    elif command -v curl &> /dev/null; then
        response=$(curl -sf --max-time "${TIMEOUT}" "${url}" 2>/dev/null)
        exit_code=$?
    else
        echo "Neither wget nor curl is available"
        exit 1
    fi
    
    if [ $exit_code -ne 0 ]; then
        echo "Health check failed: unable to connect to ${url}"
        exit 1
    fi
    
    # Check response for healthy status
    if echo "$response" | grep -qi "ok\|healthy\|true"; then
        echo "Health check passed: ${endpoint}"
        exit 0
    else
        echo "Health check failed: unexpected response - ${response}"
        exit 1
    fi
}

# Main
case "$CHECK_TYPE" in
    live|liveness)
        health_check "$LIVE_ENDPOINT"
        ;;
    ready|readiness)
        health_check "$READY_ENDPOINT"
        ;;
    all)
        echo "Running liveness check..."
        health_check "$LIVE_ENDPOINT"
        echo "Running readiness check..."
        health_check "$READY_ENDPOINT"
        echo "All health checks passed!"
        ;;
    *)
        echo "Usage: $0 [live|ready|all]"
        echo "  live  - Check liveness endpoint (is the process running?)"
        echo "  ready - Check readiness endpoint (is the service ready for traffic?)"
        echo "  all   - Run both checks"
        exit 1
        ;;
esac
