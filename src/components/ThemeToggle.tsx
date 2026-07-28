'use client';

import { Moon } from 'lucide-react';
import { useEffect } from 'react';

const STORAGE_KEY = 'maramis-theme';

export function ThemeToggle() {
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const shouldUseDarkTheme = savedTheme
      ? savedTheme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    document.documentElement.classList.toggle('dark', shouldUseDarkTheme);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nextIsDark);
    localStorage.setItem(STORAGE_KEY, nextIsDark ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ubah tema tampilan"
      title="Ubah tema tampilan"
      className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition hover:scale-105 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-[#800020] focus:ring-offset-2 focus:ring-offset-background"
    >
      <Moon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
