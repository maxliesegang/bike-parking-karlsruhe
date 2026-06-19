import Head from "next/head";
import Link from "next/link";

export default function About() {
  return (
    <>
      <Head>
        <title>Über die Daten — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Informationen über die Datenquellen der Fahrrad-Abstellanlagen"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="app-page">
        <header className="app-hero">
          <div className="app-hero__content">
            <span className="app-eyebrow">Quellen und Methodik</span>
            <h1 className="kern-heading-display">Über die Daten</h1>
            <p className="app-lead">
              Das Dashboard kombiniert Community-Daten mit städtischen offenen
              Daten und macht die jeweiligen Stärken und Lücken sichtbar.
            </p>
          </div>
        </header>

        <div className="app-copy">
          <section className="app-prose" aria-labelledby="osm-heading">
            <h2 id="osm-heading" className="kern-heading-x-large">
              OpenStreetMap
            </h2>
            <p>
              Die Hauptdatenquelle dieser Anwendung sind die{" "}
              <Link className="kern-link" href="https://www.openstreetmap.org">
                OpenStreetMap
              </Link>{" "}
              Fahrrad-Abstellanlagen (amenity=bicycle_parking). Die Daten werden
              regelmäßig über die Overpass API bezogen und decken Karlsruhe
              sowie die Gemeinden des Landkreises Karlsruhe ab.
            </p>
            <p>
              <strong>Privates Parken</strong> (Zugang <em>private</em>,{" "}
              <em>no</em> oder <em>restricted</em>) wird ausgeschlossen, da es
              nicht öffentlich nutzbar ist. Kundenparkplätze (z.&nbsp;B. an
              Supermärkten) bleiben enthalten.
            </p>
            <p>
              © OpenStreetMap-Mitwirkende. Veröffentlicht unter der{" "}
              <Link
                className="kern-link"
                href="https://opendatacommons.org/licenses/odbl/"
              >
                Open Data Commons Open Database License (ODbL)
              </Link>
              .
            </p>
          </section>

          <section className="app-prose" aria-labelledby="city-heading">
            <h2 id="city-heading" className="kern-heading-x-large">
              Stadt Karlsruhe (Offene Daten)
            </h2>
            <p>
              Zusätzlich werden Daten aus dem Datensatz{" "}
              <Link
                className="kern-link"
                href="https://transparenz.karlsruhe.de/dataset/fahrrad-abstellanlagen"
              >
                Fahrrad Abstellanlagen
              </Link>{" "}
              der{" "}
              <Link
                className="kern-link"
                href="https://transparenz.karlsruhe.de/organization/47f81b28-f494-4bca-a36c-b636924ad0c3"
              >
                Stadt Karlsruhe
              </Link>{" "}
              angezeigt. Veröffentlicht unter der Lizenz{" "}
              <Link
                className="kern-link"
                href="http://creativecommons.org/licenses/by/4.0/"
              >
                Creative Commons Namensnennung - 4.0 International (CC-BY 4.0)
              </Link>
              .
            </p>
          </section>

          <section className="app-prose" aria-labelledby="method-heading">
            <h2 id="method-heading" className="kern-heading-x-large">
              Methodik
            </h2>
            <p>
              Jede Anlage wird per Punkt-in-Polygon-Zuordnung einer Region
              zugewiesen — innerhalb Karlsruhes den Stadtbezirken (admin_level
              10) bzw. Stadtteilen (admin_level 9), im Umland den Gemeinden
              (admin_level 8). Diese Ebenen überschneiden sich nicht.
            </p>
            <p>
              Einwohnerzahlen und Flächen der 28 Karlsruher Stadtteile stammen
              aus amtlichen Angaben; für Umland-Gemeinden wird die
              Einwohnerzahl, sofern in OpenStreetMap hinterlegt, übernommen und
              die Fläche aus der Geometrie berechnet. Verkehrsknoten wie der
              Hauptbahnhof bündeln viele Stellplätze und können die
              Pro-Kopf-Versorgung einer Region deutlich anheben.
            </p>
          </section>

          <section className="app-prose" aria-labelledby="map-link-heading">
            <h2 id="map-link-heading" className="kern-heading-x-large">
              Weitere Karte
            </h2>
            <p>
              Eine offizielle interaktive Karte bietet das Mobilitätsportal der
              TechnologieRegion Karlsruhe.
            </p>
            <p>
              <a
                className="kern-btn kern-btn--primary"
                href="https://mobil.trk.de/portal.html?city=LKKarlsruhe&lang=de&theme=fahrradabstellanlagen&lat=49.05152749000004&lng=8.58987063&zoom=11"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="kern-label">Zum Mobilitätsportal</span>
              </a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
