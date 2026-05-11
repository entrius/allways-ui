/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_REACT_APP_BASE_URL: string;
  readonly VITE_SWAP_API_URL?: string;
  readonly VITE_SUBTENSOR_WS_URL?: string;
  readonly VITE_EXPLORER_EXTRINSIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
