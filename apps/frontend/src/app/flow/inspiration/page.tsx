import { redirect } from 'next/navigation';

export default function InspirationSingularRedirect() {
  // Redirect legacy/singular path to the correct plural route
  redirect('/flow/inspirations');
}


