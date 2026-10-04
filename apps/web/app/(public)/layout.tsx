export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="public-shell">{children}</div>;
}
