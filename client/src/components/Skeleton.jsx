import React from 'react';

const Skeleton = ({ className = '', count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />
    ))}
  </>
);

const CardSkeleton = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <div className="grid grid-cols-2 gap-4 pt-2">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
    </div>
  </div>
);

const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm space-y-3">
    <div className="flex gap-6 pb-3 border-b border-gray-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-24" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-6 py-2">
        {Array.from({ length: 5 }).map((_, j) => (
          <Skeleton key={j} className="h-4 w-24" />
        ))}
      </div>
    ))}
  </div>
);

export { Skeleton, CardSkeleton, TableSkeleton };