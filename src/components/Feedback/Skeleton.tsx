
export function Skeleton({ width = '100%', height = 16, rounded = 'md', count }: { width?: string | number; height?: string | number; rounded?: 'sm' | 'md' | 'lg' | 'full'; count?: number; lines?: number; variant?: 'text' | 'circle' | 'rect' }) {
  const style = { width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height };
  const item = (i: number) => <span key={i} className={`skeleton skeleton--${rounded}`} style={style} aria-hidden="true" />;
  return <span className="skeletonStack" aria-label="Loading">{Array.from({ length: count ?? 1 }, (_, i) => item(i))}</span>;
}
