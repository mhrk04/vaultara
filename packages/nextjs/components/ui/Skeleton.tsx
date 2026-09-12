export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-800 ${className}`} />;
}

export function FileCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 p-4">
      <Skeleton className="h-10 w-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
