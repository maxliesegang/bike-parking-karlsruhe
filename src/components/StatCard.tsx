import { Rating } from "@/lib/osm/analytics";

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

const RATING_STYLE: Record<Rating, { color: string; label: string }> = {
  good: { color: "#2e7d32", label: "Gut" },
  medium: { color: "#f57c00", label: "Mittel" },
  poor: { color: "#d32f2f", label: "Schlecht" },
  unrated: { color: "#9e9e9e", label: "Keine Daten" },
};

export function RatingBadge({ rating }: { rating: Rating }) {
  const { label } = RATING_STYLE[rating];
  return <span className={`app-rating app-rating--${rating}`}>{label}</span>;
}

export { RATING_STYLE };
