import { create } from 'zustand';
import { DiagnosticReport, diagnosticReporter } from '@/services/error-reporter';

interface ErrorStoreState {
  activeReport: DiagnosticReport | null;
  isModalOpen: boolean;
  reportError: (
    error: Error | string,
    metadata?: {
      activeFormat?: string;
      documentLength?: number;
      quarantinedTokensCount?: number;
    }
  ) => void;
  dismissError: () => void;
}

export const useErrorStore = create<ErrorStoreState>((set) => ({
  activeReport: null,
  isModalOpen: false,

  reportError: (error, metadata) => {
    const report = diagnosticReporter.createReport(error, metadata);
    set({ activeReport: report, isModalOpen: true });
  },

  dismissError: () => {
    set({ isModalOpen: false, activeReport: null });
  },
}));
