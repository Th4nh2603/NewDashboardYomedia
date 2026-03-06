/// <reference types="node" />

/**
 * Fix: Replaced failing vite/client reference and added NodeJS types for process.env
 * to support process.env.API_KEY as per GenAI guidelines.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
  }
}

interface Window {
  aistudio: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

interface ImportMetaEnv {
  readonly API_KEY: string;
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
