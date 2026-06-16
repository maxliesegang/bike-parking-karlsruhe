import { Typography, Box, Button } from "@mui/material";
import Head from "next/head";
import Link from "next/link";

export default function About() {
  return (
    <>
      <Head>
        <title>Über die Daten - Fahrrad-Abstellanlagen</title>
        <meta
          name="description"
          content="Informationen über die Datenquellen der Fahrrad-Abstellanlagen"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        Über die Daten
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" gutterBottom>
          OpenStreetMap
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Die Hauptdatenquelle dieser Anwendung sind die{" "}
          <Link href="https://www.openstreetmap.org">
            OpenStreetMap
          </Link>{" "}
          Fahrrad-Abstellanlagen (amenity=bicycle_parking). Die Daten werden
          regelmäßig über die Overpass API bezogen und decken ein größeres
          Gebiet um Karlsruhe ab.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          © OpenStreetMap-Mitwirkende. Veröffentlicht unter der{" "}
          <Link href="https://opendatacommons.org/licenses/odbl/">
            Open Data Commons Open Database License (ODbL)
          </Link>
          .
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" gutterBottom>
          Stadt Karlsruhe (Offene Daten)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Zusätzlich werden Daten aus dem Datensatz{" "}
          <Link href="https://transparenz.karlsruhe.de/dataset/fahrrad-abstellanlagen">
            Fahrrad Abstellanlagen
          </Link>{" "}
          der{" "}
          <Link href="https://transparenz.karlsruhe.de/organization/47f81b28-f494-4bca-a36c-b636924ad0c3">
            Stadt Karlsruhe
          </Link>{" "}
          angezeigt. Veröffentlicht unter der Lizenz{" "}
          <Link href="http://creativecommons.org/licenses/by/4.0/">
            Creative Commons Namensnennung - 4.0 International (CC-BY 4.0)
          </Link>
          .
        </Typography>
      </Box>

      <Box>
        <Typography variant="h2" gutterBottom>
          Interaktive Karte
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Für eine interaktive Kartenansicht der Fahrrad-Abstellanlagen besuchen
          Sie bitte das Mobilitätsportal der Technologie Region Karlsruhe:
        </Typography>
        <Button
          variant="contained"
          color="primary"
          href="https://mobil.trk.de/portal.html?city=LKKarlsruhe&lang=de&theme=fahrradabstellanlagen&lat=49.05152749000004&lng=8.58987063&zoom=11"
          target="_blank"
          rel="noopener noreferrer"
        >
          Zur interaktiven Karte
        </Button>
      </Box>
    </>
  );
}
