"use client";

// Skeleton components for loading states

export function TokenSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border animate-pulse">
      <div className="w-5 h-5 bg-muted rounded" />
      <div className="w-10 h-10 bg-muted rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-32" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-4 bg-muted rounded w-16 ml-auto" />
        <div className="h-3 bg-muted rounded w-12 ml-auto" />
      </div>
    </div>
  );
}

export function TokenListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TokenSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChainSelectorSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-32 bg-muted rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card rounded-xl border p-6 animate-pulse ${className}`}>
      <div className="h-6 bg-muted rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/2 mb-2" />
      <div className="h-8 bg-muted rounded w-2/3" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 bg-muted rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
      <div className="h-4 bg-muted rounded w-20" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Main content */}
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
