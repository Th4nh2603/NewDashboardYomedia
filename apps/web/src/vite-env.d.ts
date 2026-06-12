/// <reference types="vite/client" />
/// <reference types="node" />

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
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
