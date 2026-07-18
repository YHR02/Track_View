import { create } from 'zustand';

interface SettingsState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const STORAGE_KEY = 'trackwise_settings';

const loadStored = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        theme: (parsed.theme as 'light' | 'dark') || 'dark',
      };
    } catch {
      // Ignore
    }
  }
  return {
    theme: 'dark' as 'light' | 'dark',
  };
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadStored(),
  toggleTheme: () => {
    set((state) => {
      const nextTheme: 'light' | 'dark' = state.theme === 'light' ? 'dark' : 'light';
      const next = { ...state, theme: nextTheme };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: next.theme,
      }));
      // Apply theme to document root
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  },
}));

// Set initial class on html element
if (useSettingsStore.getState().theme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
