import { redirect } from 'next/navigation';
import { getCurrentUser } from './current-user';

/**
 * Landing and auth screens (/, register, password reset) send signed-in users to the workspace.
 * Content pages (/methodology, /map, /contact, /privacy, /terms) stay reachable while signed in.
 */
export async function redirectIfSignedIn() {
  if (await getCurrentUser()) redirect('/dashboard');
}
