import { redirect } from 'next/navigation';

/** The application opens on the dashboard. */
export default function RootPage() {
  redirect('/dashboard');
}
