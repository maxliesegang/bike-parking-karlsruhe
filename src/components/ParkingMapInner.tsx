import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { Feature, Geometry } from "geojson";
import { Box, Paper, Typography } from "@mui/material";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { VersorgungEintrag } from "@/lib/osmDataProcessor";
import { BEWERTUNG_STYLE } from "./StatCard";
import "leaflet/dist/leaflet.css";

interface ParkingMapInnerProps {
  parkings: OsmBikeParking[];
  boundaries: GeoJSON.FeatureCollection;
  versorgung: VersorgungEintrag[];
}

// A CSS dot — a DivIcon needs no image assets, so it sidesteps Leaflet's
// default-marker icon URLs breaking under the GitHub Pages basePath.
const dotIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:10px;height:10px;border-radius:50%;background:#005538;border:1px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.4)"></span>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const KARLSRUHE_CENTER: [number, number] = [49.0069, 8.4037];

export default function ParkingMapInner({
  parkings,
  boundaries,
  versorgung,
}: ParkingMapInnerProps) {
  const bewertungByName = useMemo(() => {
    const m = new Map<string, VersorgungEintrag>();
    for (const v of versorgung) m.set(v.name, v);
    return m;
  }, [versorgung]);

  const styleFeature = (feature?: Feature<Geometry>) => {
    const name = (feature?.properties?.name as string) || "";
    const entry = bewertungByName.get(name);
    const color = entry
      ? BEWERTUNG_STYLE[entry.bewertung].color
      : BEWERTUNG_STYLE.unbewertet.color;
    return { color: "#555", weight: 1, fillColor: color, fillOpacity: 0.35 };
  };

  const onEachFeature = (feature: Feature<Geometry>, layer: L.Layer) => {
    const name = (feature.properties?.name as string) || "Unbekannt";
    const entry = bewertungByName.get(name);
    const supply =
      entry && entry.pro1000 !== null
        ? `${entry.pro1000} Stellplätze / 1.000 EW`
        : "keine Einwohnerdaten";
    const spots = entry ? entry.stellplaetze.toLocaleString("de-DE") : "0";
    layer.bindTooltip(
      `<strong>${name}</strong><br/>${spots} Stellplätze<br/>${supply}`,
      { sticky: true },
    );
  };

  return (
    <Box sx={{ position: "relative", height: 520, borderRadius: 2, overflow: "hidden" }}>
      <MapContainer
        center={KARLSRUHE_CENTER}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          data={boundaries}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
        <MarkerClusterGroup chunkedLoading>
          {parkings.map((p) => (
            <Marker
              key={p.id}
              position={[p.coordinate1, p.coordinate0]}
              icon={dotIcon}
            >
              <Popup>
                <strong>{p.standort || "Fahrrad-Abstellanlage"}</strong>
                <br />
                {p.art}
                {p.stellplaetze > 0 && ` · ${p.stellplaetze} Stellplätze`}
                <br />
                {p.region || "außerhalb"}
                {p.betreiber && (
                  <>
                    <br />
                    Betreiber: {p.betreiber}
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 1000,
          p: 1.5,
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}>
          Versorgung (Stellplätze / 1.000 EW)
        </Typography>
        {(["gut", "mittel", "schlecht", "unbewertet"] as const).map((b) => (
          <Box key={b} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                bgcolor: BEWERTUNG_STYLE[b].color,
                opacity: 0.6,
                borderRadius: 0.5,
                border: "1px solid #555",
              }}
            />
            <Typography variant="caption">
              {b === "gut"
                ? "Gut (≥ 10)"
                : b === "mittel"
                  ? "Mittel (3–9)"
                  : b === "schlecht"
                    ? "Schlecht (< 3)"
                    : "Keine Einwohnerdaten"}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
