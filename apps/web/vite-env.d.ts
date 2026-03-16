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

declare interface ImportMetaEnv {
  readonly API_KEY: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_SERVER_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
