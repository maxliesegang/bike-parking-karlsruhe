import dynamic from "next/dynamic";

// Maplibre GL JS touches `window`, so the actual map must never be
// server-rendered or statically pre-rendered. Load it client-side only.
const SupplyMapInner = dynamic(() => import("./SupplyMapInner"), {
  ssr: false,
  loading: () => (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading__content">
        <span className="kern-loader kern-loader--visible" aria-hidden="true" />
        <span>Karte wird geladen.</span>
      </div>
    </div>
  ),
});

export default SupplyMapInner;
