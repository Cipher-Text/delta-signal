import Link from 'next/link';

type LegalSection = {
  title: string;
  children: React.ReactNode;
};

export default function LegalPage({
  label,
  title,
  intro,
  sections,
}: {
  label: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link href="/" className="legal-brand">
          <img src="/logo.svg" alt="" width={36} height={36} />
          <span>Delta Signal</span>
        </Link>
        <Link href="/" className="text-link">Back to platform</Link>
      </header>

      <article className="legal-document">
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <p className="legal-updated">Last updated: September 21, 2026</p>

        {sections.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.children}
          </section>
        ))}
      </article>
    </main>
  );
}
