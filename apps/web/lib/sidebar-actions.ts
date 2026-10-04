'use server';

import { setSidebarCollapsed } from './sidebar';

/** Persists the sidebar state. No revalidation: the client already reflects it. */
export async function setSidebarAction(formData: FormData) {
  await setSidebarCollapsed(formData.get('collapsed') === 'true');
}
