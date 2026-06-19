import dynamic from "next/dynamic";

// Leaflet touches `window`, so the actual map must never be server-rendered or
// statically pre-rendered. Load it client-side only.
const ParkingMapInner = dynamic(() => import("./ParkingMapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="app-loading app-loading--large"
      role="status"
      aria-live="polite"
    >
      <div className="app-loading__content">
        <span className="kern-loader kern-loader--visible" aria-hidden="true" />
        <span>Karte wird geladen.</span>
      </div>
    </div>
  ),
});

export default ParkingMapInner;
