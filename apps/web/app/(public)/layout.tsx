import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/current-user';

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <div className="public-shell">
      {children}
    </div>
  );
}
