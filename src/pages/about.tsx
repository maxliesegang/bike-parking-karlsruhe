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
          regelmäßig über die Overpass API bezogen und decken Karlsruhe sowie
          die Gemeinden des Landkreises Karlsruhe ab.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <strong>Privates Parken</strong> (Zugang <em>private</em>,{" "}
          <em>no</em> oder <em>restricted</em>) wird ausgeschlossen, da es nicht
          öffentlich nutzbar ist. Kundenparkplätze (z.&nbsp;B. an Supermärkten)
          bleiben enthalten.
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

      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" gutterBottom>
          Methodik
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Jede Anlage wird per Punkt-in-Polygon-Zuordnung einer Region
          zugewiesen — innerhalb Karlsruhes den Stadtbezirken (admin_level 10)
          bzw. Stadtteilen (admin_level 9), im Umland den Gemeinden
          (admin_level 8). Diese Ebenen überschneiden sich nicht.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Einwohnerzahlen und Flächen der 28 Karlsruher Stadtteile stammen aus
          amtlichen Angaben; für Umland-Gemeinden wird die Einwohnerzahl – sofern
          in OpenStreetMap hinterlegt – übernommen und die Fläche aus der
          Geometrie berechnet. Verkehrsknoten wie der Hauptbahnhof bündeln viele
          Stellplätze und können die Pro-Kopf-Versorgung einer Region deutlich
          anheben.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h2" gutterBottom>
          Weitere Karte
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Eine offizielle interaktive Karte bietet das Mobilitätsportal der
          TechnologieRegion Karlsruhe:
        </Typography>
        <Button
          variant="contained"
          color="primary"
          href="https://mobil.trk.de/portal.html?city=LKKarlsruhe&lang=de&theme=fahrradabstellanlagen&lat=49.05152749000004&lng=8.58987063&zoom=11"
          target="_blank"
          rel="noopener noreferrer"
        >
          Zum Mobilitätsportal
        </Button>
      </Box>
    </>
  );
}
