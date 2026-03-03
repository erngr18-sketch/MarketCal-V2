'use client';

import Link from 'next/link';
import clsx from 'clsx';

export function NavItem({
  href,
  label,
  icon,
  active
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
        active
          ? 'bg-brand-50 text-accent-900'
          : 'text-slate-700 hover:bg-surface-100 hover:text-accent-900'
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
