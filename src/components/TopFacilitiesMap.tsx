import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";
import type { TopFacility } from "@/lib/osm/analytics";

// Leaflet touches `window`, so the actual map must never be server-rendered or
// statically pre-rendered. Load it client-side only.
const Inner = dynamic(() => import("./TopFacilitiesMapInner"), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        height: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        borderRadius: 2,
      }}
    >
      <CircularProgress />
    </Box>
  ),
});

export default function TopFacilitiesMap({
  facilities,
}: {
  facilities: TopFacility[];
}) {
  return <Inner facilities={facilities} />;
}
