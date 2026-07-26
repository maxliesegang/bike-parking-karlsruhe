import { LegendStop } from "@/lib/map/scales";

/**
 * Swatch row under a map. Always rendered when a view encodes anything by
 * colour: the map's own colours are the only key the canvas can carry, and a
 * legend keeps identity from resting on colour alone.
 */
export function MapLegend({
  stops,
  caption,
}: {
  stops: LegendStop[];
  caption: string;
}) {
  return (
    <div className="app-map-legend">
      <span className="app-map-legend__caption">{caption}</span>
      <ul className="app-map-legend__items">
        {stops.map((stop) => (
          <li key={stop.label} className="app-map-legend__item">
            <span
              className="app-map-legend__swatch"
              style={{ background: stop.color }}
              aria-hidden="true"
            />
            {stop.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
