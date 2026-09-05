'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/intelligence', label: 'Intelligence' },
  { href: '/catalog', label: 'Service Catalog' },
  { href: '/estimates', label: 'Estimates' },
  { href: '/clients', label: 'Clients' },
  { href: '/quotations', label: 'Quotations' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/projects', label: 'Projects' },
  { href: '/users', label: 'Users' },
  { href: '/settings', label: 'Settings' },
  { href: '/account', label: 'My Account' },
];

export function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme from localStorage or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem('agency-theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light');
    } else {
      setTheme('dark');
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      localStorage.setItem('agency-theme', 'light');
      document.documentElement.classList.add('light');
    } else {
      setTheme('dark');
      localStorage.setItem('agency-theme', 'dark');
      document.documentElement.classList.remove('light');
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center border-b border-border px-5">
          <span className="text-sm font-semibold tracking-wide text-text">
            AGENCY<span className="text-primary">SYSTEM</span>
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-surface-elevated text-primary font-medium'
                    : 'text-text-muted hover:bg-surface-elevated hover:text-text'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            {theme === 'dark' ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light Mode
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark Mode
              </>
            )}
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-bg">{children}</main>
    </div>
  );
}
