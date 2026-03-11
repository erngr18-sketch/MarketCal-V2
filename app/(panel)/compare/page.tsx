import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function LegacyComparePage() {
  redirect(routes.analyses.marketplaceComparison);
}
