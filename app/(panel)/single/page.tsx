import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function LegacySinglePage() {
  redirect(routes.analyses.profitScenario);
}
