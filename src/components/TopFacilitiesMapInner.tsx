import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { TopFacility } from "@/lib/osm/analytics";
import "leaflet/dist/leaflet.css";

const KARLSRUHE_CENTER: [number, number] = [49.0069, 8.4037];

// Numbered amber markers — visually distinct from the full map's small green
// dots. A DivIcon needs no image assets, so it sidesteps Leaflet's default-marker
// icon URLs breaking under the GitHub Pages basePath. Only ~10 facilities, so a
// per-marker icon instance is fine.
function numberedIcon(rank: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#9d4d12;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);color:#fff;font-weight:700;font-size:13px;line-height:1">${rank}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Fit the view to the markers once they're known.
function FitBounds({ facilities }: { facilities: TopFacility[] }) {
  const map = useMap();

  useEffect(() => {
    if (!facilities.length) return;
    const bounds = L.latLngBounds(
      facilities.map((f) => [f.lat, f.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, facilities]);

  return null;
}

export default function TopFacilitiesMapInner({
  facilities,
}: {
  facilities: TopFacility[];
}) {
  return (
    <MapContainer
      center={KARLSRUHE_CENTER}
      zoom={11}
      style={{ height: 420, width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds facilities={facilities} />
      {facilities.map((f) => {
        const badges: string[] = [];
        if (f.covered) badges.push("überdacht");
        if (f.fee) badges.push("kostenpflichtig");
        return (
          <Marker
            key={f.rank}
            position={[f.lat, f.lng]}
            icon={numberedIcon(f.rank)}
          >
            <Popup>
              <strong>
                #{f.rank} {f.name}
              </strong>
              <br />
              {f.type} · {f.capacity} Stellplätze
              <br />
              {f.region || "außerhalb der Stadtteile"}
              {badges.length > 0 && (
                <>
                  <br />
                  {badges.join(" · ")}
                </>
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
