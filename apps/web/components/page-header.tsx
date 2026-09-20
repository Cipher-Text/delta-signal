import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Only render when it carries real information — data freshness, current
   * filter scope, or a genuine category. Skip it rather than repeat the title. */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Right-aligned slot for a secondary CTA (e.g. a link to a related page). */
  action?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="panel-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
