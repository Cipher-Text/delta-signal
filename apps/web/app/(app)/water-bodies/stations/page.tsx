import { redirect } from 'next/navigation';

/** The stations list now lives in the Water Bodies tabbed view; old links keep working. */
export default async function StationsRedirect(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams;
  const params = new URLSearchParams({ tab: 'stations' });
  for (const [key, value] of Object.entries(sp)) if (value) params.set(key, value);
  redirect(`/water-bodies?${params}`);
}
