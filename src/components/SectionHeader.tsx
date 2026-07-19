import { ReactNode } from "react";

// A section title plus optional description. The `id` links back to the
// enclosing <section aria-labelledby=…>, so the heading and its region stay
// wired together in one place.
export function SectionHeader({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="app-section__header">
      <h2 id={id} className="kern-heading-x-large">
        {title}
      </h2>
      {children && <p className="app-muted">{children}</p>}
    </div>
  );
}
