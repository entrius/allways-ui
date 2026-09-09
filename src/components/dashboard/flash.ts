import { keyframes } from '@mui/material/styles';

// The one value-change flash on the site: a filled inset that fades over
// ~1.4s. The colour comes from the `--flash` custom property the caller
// sets, so a cell can flash in its own tint. Restart it by remounting the
// element (a fresh key) whenever the value moves.
export const flash = keyframes`
  from { box-shadow: inset 0 0 0 999px var(--flash); }
  to   { box-shadow: inset 0 0 0 999px transparent; }
`;
export const FLASH_ANIMATION = `${flash} 1.4s ease-out`;
