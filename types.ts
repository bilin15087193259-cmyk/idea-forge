export interface ProcessedIdea {
  id: string;
  original: string;
  markdown: string;
  timestamp: number;
  preview: string; // A short snippet for the history list
}

export interface ProcessingState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface PromptConfig {
  currentDate: string;
  currentTime: string;
}