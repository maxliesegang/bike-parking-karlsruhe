import { ReactNode } from "react";

// The compact page header shared by every route: an accent kicker, the page
// title, and an optional lead paragraph. Centralising it keeps the hero rhythm
// consistent and gives the design a single place to evolve.
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="app-hero">
      <div className="app-hero__content">
        <span className="app-eyebrow">{eyebrow}</span>
        <h1 className="kern-heading-display">{title}</h1>
        {children && <p className="app-lead">{children}</p>}
      </div>
    </header>
  );
}
