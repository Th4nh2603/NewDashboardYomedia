/// <reference types="vite/client" />

interface Window {
  aistudio: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

declare interface ImportMetaEnv {
  readonly VITE_API_KEY?: string;
  readonly VITE_SERVER_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
