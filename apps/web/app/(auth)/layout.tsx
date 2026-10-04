import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/current-user';

/** Full-bleed auth screens (§3.3): no public shell padding, signed-in users go to the workspace. */
export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return <>{children}</>;
}
