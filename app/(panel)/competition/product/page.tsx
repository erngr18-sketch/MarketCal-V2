import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function LegacyCompetitionProductPage() {
  redirect(routes.analyses.pricePosition);
}
