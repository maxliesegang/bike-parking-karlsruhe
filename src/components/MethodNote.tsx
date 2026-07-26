import { ReactNode } from "react";

/**
 * The reasoning behind a table, folded away.
 *
 * Every figure on the analysis page needs a caveat to be read honestly, but
 * three paragraphs above a table push the table itself below the fold and get
 * skipped by exactly the readers who need them. A disclosure serves both: the
 * numbers stay first, the method is one click away and stays quotable.
 */
export function MethodNote({
  title = "Wie wird das gerechnet?",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <details className="kern-accordion app-details">
      <summary className="kern-accordion__header">
        <span className="kern-label">{title}</span>
      </summary>
      <div className="kern-accordion__body">{children}</div>
    </details>
  );
}
