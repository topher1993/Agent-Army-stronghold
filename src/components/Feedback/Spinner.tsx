
export function Spinner({ size = 'md', tone = 'inherit', label = 'Loading' }: { size?: 'sm' | 'md' | 'lg'; tone?: 'inherit' | 'inverse'; label?: string }) {
  return <span className={`spinner spinner--${size} spinner--${tone}`} role="status" aria-label={label} />;
}
