import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LLMProvider } from '@/lib/models';

interface SettingsState {
  googleApiKey: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  openRouterApiKey: string;
  politePoolEmail: string;

  activeProvider: LLMProvider;
  activeModelId: string;
  isSettingsOpen: boolean;

  setKeys: (keys: Partial<Record<'googleApiKey' | 'anthropicApiKey' | 'openRouterApiKey' | 'openaiApiKey' | 'politePoolEmail', string>>) => void;
  setActiveEngine: (provider: LLMProvider, modelId: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  getActiveKey: () => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      googleApiKey: '',
      anthropicApiKey: '',
      openaiApiKey: '',
      openRouterApiKey: '',
      politePoolEmail: 'admin@recite.ai',
      activeProvider: 'google',
      activeModelId: 'gemini-3.7-flash',
      isSettingsOpen: false,

      setKeys: (newKeys) => set((state) => ({ ...state, ...newKeys })),
      setActiveEngine: (activeProvider, activeModelId) => set({ activeProvider, activeModelId }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),

      getActiveKey: () => {
        const { activeProvider, googleApiKey, anthropicApiKey, openaiApiKey, openRouterApiKey } = get();
        switch (activeProvider) {
          case 'google': return googleApiKey;
          case 'anthropic': return anthropicApiKey;
          case 'openai': return openaiApiKey;
          case 'openrouter': return openRouterApiKey;
          default: return '';
        }
      },
    }),
    { name: 'reciteai-user-settings', storage: createJSONStorage(() => localStorage) }
  )
);
