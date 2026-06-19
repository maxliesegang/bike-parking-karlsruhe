import { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { href: "/", label: "Übersicht" },
  { href: "/analyse", label: "Analyse" },
  { href: "/vergleich", label: "Vergleich" },
  { href: "/progress", label: "Entwicklung" },
  { href: "/about", label: "Über die Daten" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? router.pathname === href : router.pathname.startsWith(href);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="kern-container">
          <div className="app-brand-row">
            <Link className="app-brand" href="/" aria-label="Zur Übersicht">
              <span className="app-brand__mark" aria-hidden="true">
                P
              </span>
              <span className="app-brand__text">
                <span className="app-brand__title">
                  Fahrradparken Karlsruhe
                </span>
                <span className="app-brand__meta">
                  OSM-Auswertung und Datenvergleich
                </span>
              </span>
            </Link>
            <button
              className="kern-btn kern-btn--secondary app-nav-toggle"
              type="button"
              aria-controls="app-navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <span className="kern-label">Menü</span>
            </button>
          </div>

          <nav
            id="app-navigation"
            className="app-nav"
            data-open={mobileOpen}
            aria-label="Hauptnavigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="app-nav__link"
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main" id="main-content">
        <div className="kern-container">{children}</div>
      </main>

      <footer className="app-footer">
        <div className="kern-container app-footer__content">
          <span className="app-footnote">
            Datenbasis: OpenStreetMap und Offene Daten Karlsruhe
          </span>
          <Link className="kern-link kern-link--x-small" href="/about">
            Über die Daten
          </Link>
        </div>
      </footer>
    </div>
  );
}
