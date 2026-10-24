import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'rohani_theme_mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  /** Active setting chosen by user: 'light', 'dark', or 'system' */
  readonly currentMode = signal<ThemeMode>(this.getStoredMode());

  /** System OS preference live signal */
  private readonly systemPrefersDark = signal<boolean>(this.checkSystemPrefersDark());

  /** Effective active theme: true if dark, false if light/white */
  readonly isDark = computed(() => {
    const mode = this.currentMode();
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return this.systemPrefersDark();
  });

  /** Resolved theme name: 'dark' or 'light' */
  readonly resolvedTheme = computed<'dark' | 'light'>(() => (this.isDark() ? 'dark' : 'light'));

  constructor() {
    // Initial immediate application
    this.applyTheme(this.resolvedTheme());

    // Reactive effect ensures any change to resolvedTheme automatically updates DOM
    effect(() => {
      const theme = this.resolvedTheme();
      this.applyTheme(theme);
    });

    // Watch OS color scheme changes live
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', (e) => {
        this.systemPrefersDark.set(e.matches);
      });
    }
  }

  setTheme(mode: ThemeMode): void {
    this.currentMode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }

  toggleTheme(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    const root = this.doc.documentElement;
    const body = this.doc.body;

    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    if (body) {
      body.setAttribute('data-theme', theme);
      body.classList.toggle('dark', theme === 'dark');
    }

    // Update browser theme-color meta tag for mobile address bars
    const meta = this.doc.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0b1410' : '#ffffff');
    }
  }

  private getStoredMode(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {}
    return 'light';
  }

  private checkSystemPrefersDark(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
}
