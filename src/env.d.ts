/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_REACT_APP_BASE_URL: string;
  readonly VITE_SWAP_WIDGET_URL?: string;
  readonly VITE_SWAP_WIDGET_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
