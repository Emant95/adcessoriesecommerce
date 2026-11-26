import { Loader2 } from 'lucide-react';

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-xl bg-cream ${className}`} />;

export const ProductSkeleton = () => (
  <div>
    <Skeleton className="aspect-[4/5] w-full rounded-xl2" />
    <Skeleton className="mt-3 h-4 w-3/4" />
    <Skeleton className="mt-2 h-4 w-1/3" />
  </div>
);

export const PageSpinner = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-taupe">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-line bg-ivory/60 px-6 py-16 text-center">
    {Icon && <Icon className="mb-3 h-8 w-8 text-gold" />}
    <h3 className="text-lg">{title}</h3>
    {text && <p className="mt-1 max-w-sm text-sm text-taupe">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="rounded-xl2 border border-red-100 bg-red-50/60 px-6 py-10 text-center text-sm text-red-700">
    <p>{error?.message || 'Something went wrong.'}</p>
    {onRetry && (
      <button className="btn-outline mt-4" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);
