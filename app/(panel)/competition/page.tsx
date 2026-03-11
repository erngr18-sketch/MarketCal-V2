import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function LegacyCompetitionPage() {
  redirect(routes.analyses.marketAnalysis);
}
