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
          content="Informationen über die Datenquelle der Fahrrad-Abstellanlagen"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        Über die Daten
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography paragraph>
          Datensatz{" "}
          <Link href="https://transparenz.karlsruhe.de/dataset/fahrrad-abstellanlagen">
            Fahrrad Abstellanlagen
          </Link>
          ,{" "}
          <Link href="https://transparenz.karlsruhe.de/organization/47f81b28-f494-4bca-a36c-b636924ad0c3">
            Stadt Karlsruhe
          </Link>
          . Veröffentlicht unter der Lizenz{" "}
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
        <Typography paragraph>
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
