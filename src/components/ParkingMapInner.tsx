import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Box, CircularProgress, Typography } from "@mui/material";
import L from "leaflet";
import { MapParking, MAP_DATA_URL } from "@/models/map-parking";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// A CSS dot — a DivIcon needs no image assets, so it sidesteps Leaflet's
// default-marker icon URLs breaking under the GitHub Pages basePath. Shared
// across all markers so we allocate one icon instance, not thousands.
const dotIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:10px;height:10px;border-radius:50%;background:#005538;border:1px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.4)"></span>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const KARLSRUHE_CENTER: [number, number] = [49.0069, 8.4037];

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function popupHtml(p: MapParking): string {
  const rows: string[] = [];
  rows.push(`<strong>${esc(p.name || "Fahrrad-Abstellanlage")}</strong>`);

  const head = [p.type];
  if (p.capacity > 0) head.push(`${p.capacity} Stellplätze`);
  rows.push(esc(head.join(" · ")));

  rows.push(esc(p.region || "außerhalb der Stadtteile"));

  const props: string[] = [];
  if (p.covered) props.push("überdacht");
  if (p.fee) props.push("kostenpflichtig");
  if (p.access) props.push(`Zugang: ${p.access}`);
  if (props.length) rows.push(esc(props.join(" · ")));

  if (p.operator) rows.push(`Betreiber: ${esc(p.operator)}`);
  if (p.note) rows.push(esc(p.note));

  return rows.join("<br/>");
}

// Builds the marker-cluster layer imperatively. Rendering thousands of React
// <Marker> elements would choke reconciliation; instead we create plain Leaflet
// markers in one pass and add them in bulk, with popup HTML built lazily on open.
function ParkingMarkers({ parkings }: { parkings: MapParking[] }) {
  const map = useMap();

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      // Don't draw cluster-spanning polygons on hover — pure cosmetic cost.
      showCoverageOnHover: false,
      // Smaller groups → more, finer clusters at a given zoom...
      maxClusterRadius: 40,
      // ...and stop clustering entirely once zoomed in, so individual spots show.
      disableClusteringAtZoom: 15,
    });

    const markers = parkings.map((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: dotIcon });
      // Lazy popup: HTML is built only when the marker is actually clicked.
      marker.bindPopup(() => popupHtml(p));
      return marker;
    });

    cluster.addLayers(markers);
    map.addLayer(cluster);

    return () => {
      map.removeLayer(cluster);
    };
  }, [map, parkings]);

  return null;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        height: 520,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        borderRadius: 2,
      }}
    >
      {children}
    </Box>
  );
}

export default function ParkingMapInner() {
  const { basePath } = useRouter();
  const [parkings, setParkings] = useState<MapParking[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${basePath}${MAP_DATA_URL}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: MapParking[]) => {
        if (active) setParkings(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [basePath]);

  if (failed) {
    return (
      <Overlay>
        <Typography color="text.secondary">
          Kartendaten konnten nicht geladen werden.
        </Typography>
      </Overlay>
    );
  }

  if (!parkings) {
    return (
      <Overlay>
        <CircularProgress />
      </Overlay>
    );
  }

  return (
    <MapContainer
      center={KARLSRUHE_CENTER}
      zoom={11}
      style={{ height: 520, width: "100%", borderRadius: 8 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ParkingMarkers parkings={parkings} />
    </MapContainer>
  );
}
