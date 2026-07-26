import { Rating } from "@/lib/osm/regionMetrics";

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <article className="kern-card kern-card--small app-stat">
      <div className="kern-card__container">
        <div className="kern-card__body">
          <strong className="app-stat__value">{value}</strong>
          <span className="app-stat__label">{label}</span>
          {sub && <span className="app-stat__sub">{sub}</span>}
        </div>
      </div>
    </article>
  );
}

// Ratings are relative to the region's own peer group — its median, or a floor
// where that median is near zero. The labels therefore say "above/below the
// comparison value" instead of implying an absolute verdict.
const RATING_STYLE: Record<
  Rating,
  { color: string; label: string; title: string }
> = {
  good: {
    color: "#2e7d32",
    label: "über Ø",
    title: "Deutlich über dem Vergleichswert der Gruppe",
  },
  medium: {
    color: "#f57c00",
    label: "Ø",
    title: "Etwa auf dem Vergleichswert der Gruppe",
  },
  poor: {
    color: "#d32f2f",
    label: "unter Ø",
    title: "Deutlich unter dem Vergleichswert der Gruppe",
  },
  unrated: {
    color: "#9e9e9e",
    label: "—",
    title: "Keine Einwohnerzahl bekannt",
  },
};

export function RatingBadge({ rating }: { rating: Rating }) {
  const { label, title } = RATING_STYLE[rating];
  return (
    <span className={`app-rating app-rating--${rating}`} title={title}>
      {label}
    </span>
  );
}

export { RATING_STYLE };
