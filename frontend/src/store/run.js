import { create } from 'zustand';

/**
 * Current extraction run state.
 * Holds the active image, the backend response, and live params.
 */
export const useRunStore = create((set, get) => ({
  // The image file the user uploaded
  imageFile: null,
  imageUrl: null,

  // Backend extraction response
  diagramType: null,  // 'free_body' | 'circuit' | 'state_machine' | null
  extractedData: null,

  // UI flow status
  status: 'idle', // 'idle' | 'uploading' | 'analyzing' | 'success' | 'error' | 'unsupported'
  errorMessage: null,

  // AbortController for cancelling in-flight requests
  abortController: null,

  setImage: (file, url) => set({ imageFile: file, imageUrl: url }),

  startAnalyzing: () => {
    const controller = new AbortController();
    set({ status: 'analyzing', abortController: controller, errorMessage: null });
    return controller;
  },

  setSuccess: (diagramType, data) => set({
    status: 'success',
    diagramType,
    extractedData: data,
    abortController: null,
  }),

  setError: (msg) => set({
    status: 'error',
    errorMessage: msg,
    abortController: null,
  }),

  setUnsupported: () => set({
    status: 'unsupported',
    abortController: null,
  }),

  cancelAnalysis: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({ status: 'idle', abortController: null });
  },

  reset: () => set({
    imageFile: null,
    imageUrl: null,
    diagramType: null,
    extractedData: null,
    status: 'idle',
    errorMessage: null,
    abortController: null,
  }),
}));
