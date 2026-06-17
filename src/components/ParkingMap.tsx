import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";

// Leaflet touches `window`, so the actual map must never be server-rendered or
// statically pre-rendered. Load it client-side only.
const ParkingMapInner = dynamic(() => import("./ParkingMapInner"), {
  ssr: false,
  loading: () => (
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
      <CircularProgress />
    </Box>
  ),
});

export default ParkingMapInner;
