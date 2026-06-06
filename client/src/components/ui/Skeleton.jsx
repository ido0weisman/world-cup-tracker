import './Skeleton.css';

// A flexible skeleton block. Use `count` to render multiple stacked rows.
// width / height / borderRadius let callers control the shape.
function Skeleton({ width = '100%', height = '1rem', borderRadius = '6px', count = 1, style = {} }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width, height, borderRadius, ...style }}
        />
      ))}
    </>
  );
}

// Pre-built skeleton for a match card
export function MatchCardSkeleton() {
  return (
    <div className="skeleton-card">
      <Skeleton height="0.7rem" width="40%" />
      <div className="skeleton-card__row">
        <Skeleton height="2.5rem" width="2.5rem" borderRadius="4px" />
        <Skeleton height="1rem" width="30%" />
        <Skeleton height="1.5rem" width="3rem" />
        <Skeleton height="1rem" width="30%" />
        <Skeleton height="2.5rem" width="2.5rem" borderRadius="4px" />
      </div>
      <Skeleton height="0.7rem" width="60%" />
    </div>
  );
}

export default Skeleton;
