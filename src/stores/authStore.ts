import { create } from 'zustand';

export interface UserProfile {
  googleUserId: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  accessToken: string;
  expiresAt: number;
  spreadsheetId: string;
  profile: UserProfile | null;
  
  // Actions
  setToken: (token: string, expiresAt: number) => void;
  setSpreadsheetId: (id: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const STORAGE_KEY_SPREADSHEET = 'trackwise_spreadsheet_id';

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: '',
  expiresAt: 0,
  spreadsheetId: localStorage.getItem(STORAGE_KEY_SPREADSHEET) || '',
  profile: null,

  setToken: (accessToken, expiresAt) => set({ accessToken, expiresAt }),
  setSpreadsheetId: (spreadsheetId) => {
    if (spreadsheetId) {
      localStorage.setItem(STORAGE_KEY_SPREADSHEET, spreadsheetId);
    } else {
      localStorage.removeItem(STORAGE_KEY_SPREADSHEET);
    }
    set({ spreadsheetId });
  },
  setProfile: (profile) => set({ profile }),
  logout: () => {
    localStorage.removeItem(STORAGE_KEY_SPREADSHEET);
    set({ accessToken: '', expiresAt: 0, spreadsheetId: '', profile: null });
  },
  isAuthenticated: () => {
    const { accessToken, expiresAt } = get();
    return !!accessToken && expiresAt > Date.now();
  },
}));
