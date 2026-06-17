import { Card, CardContent, Typography } from "@mui/material";
import { Bewertung } from "@/lib/osmDataProcessor";

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

const BEWERTUNG_STYLE: Record<Bewertung, { color: string; label: string }> = {
  gut: { color: "#2e7d32", label: "Gut" },
  mittel: { color: "#f57c00", label: "Mittel" },
  schlecht: { color: "#d32f2f", label: "Schlecht" },
  unbewertet: { color: "#9e9e9e", label: "Keine Daten" },
};

export function BewertungBadge({ bewertung }: { bewertung: Bewertung }) {
  const { color, label } = BEWERTUNG_STYLE[bewertung];
  return (
    <Typography variant="body2" sx={{ color, fontWeight: "bold" }}>
      {label}
    </Typography>
  );
}

export { BEWERTUNG_STYLE };
