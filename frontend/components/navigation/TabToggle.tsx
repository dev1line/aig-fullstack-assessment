'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Analyze' },
  { href: '/reviews', label: 'Reviews' },
];

export function TabToggle() {
  const pathname = usePathname();

  return (
    <nav className="tab-toggle" role="navigation">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tab ${pathname === tab.href ? 'active' : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
