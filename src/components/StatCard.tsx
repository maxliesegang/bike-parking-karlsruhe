import { Card, CardContent, Typography } from "@mui/material";
import { Rating } from "@/lib/osm/analytics";

export function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card elevation={2} sx={{ borderRadius: 2, height: "100%" }}>
      <CardContent sx={{ textAlign: "center", py: 2, px: 1 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: color || "primary.main" }}
        >
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const RATING_STYLE: Record<Rating, { color: string; label: string }> = {
  good: { color: "#2e7d32", label: "Gut" },
  medium: { color: "#f57c00", label: "Mittel" },
  poor: { color: "#d32f2f", label: "Schlecht" },
  unrated: { color: "#9e9e9e", label: "Keine Daten" },
};

export function RatingBadge({ rating }: { rating: Rating }) {
  const { color, label } = RATING_STYLE[rating];
  return (
    <Typography variant="body2" sx={{ color, fontWeight: "bold" }}>
      {label}
    </Typography>
  );
}

export { RATING_STYLE };
