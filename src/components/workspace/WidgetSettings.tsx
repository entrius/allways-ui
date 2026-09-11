import React, { useCallback, useState } from 'react';
import { Box, Portal, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { FONTS } from '../../theme';

// One settings control for every widget on a desk: a gear in the title row
// beside the ×, and a compact panel that hangs from it. Each widget fills
// the panel with its own rows; the chrome, the scrim and the way it opens
// and closes are the same on every widget, so a person learns it once.

const scrimIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const panelIn = keyframes`
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: none; }
`;

// Styles for the rows a widget puts in its panel, so every panel is set
// the same way.
export const settingsLabelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.62rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
} as const;

export const settingsRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 0.5,
} as const;

export const settingsLinkSx = {
  all: 'unset',
  cursor: 'pointer',
  fontFamily: FONTS.mono,
  fontSize: '0.6rem',
  color: 'text.secondary',
  '&:hover': { color: 'text.primary' },
} as const;

// Controls a widget's panel rows are built from, so every panel is set the
// same way.
// Segmented control: one bordered strip of text buttons, the active one
// filled in the text colour.
export const SettingsSeg: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  left?: boolean;
}> = ({ options, value, onChange, left }) => (
  <Box
    sx={{
      ml: left ? 0 : 'auto',
      display: 'inline-flex',
      border: '1px solid',
      borderColor: 'border.light',
    }}
  >
    {options.map((o) => {
      const on = o.value === value;
      return (
        <Box
          key={o.value}
          component="button"
          type="button"
          onClick={() => onChange(o.value)}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            px: 1,
            py: 0.25,
            fontFamily: FONTS.mono,
            fontSize: '0.62rem',
            color: on ? 'background.default' : 'text.secondary',
            backgroundColor: on ? 'text.primary' : 'transparent',
            '& + &': {
              borderLeft: '1px solid',
              borderLeftColor: 'border.light',
            },
          }}
        >
          {o.label}
        </Box>
      );
    })}
  </Box>
);

export const SettingsCheck: React.FC<{
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}> = ({ checked, onChange, children }) => (
  <Box
    component="label"
    sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
  >
    <Box
      component="input"
      type="checkbox"
      checked={checked}
      onChange={onChange}
      sx={{ m: 0, accentColor: (t) => t.palette.primary.main }}
    />
    {children}
  </Box>
);

// Where the gear sits on screen. The panel hangs from its bottom-right
// corner, so a widget on the right edge of the desk never pushes its
// panel off the page; when the gear is low in the window and there is
// more room above it than below, the panel stands on its top-right
// corner instead, so a widget at the foot of the desk is not left with a
// three-row panel and a scrollbar.
type Anchor = { top: number; bottom: number; right: number };
const EDGE = 24;
const GAP = 6;

/**
 * A widget's settings: the gear for its title row's aside slot and the
 * panel it opens. `count` marks the gear when settings are in effect (a
 * sheet with rows hidden); `onReset` adds a reset link to the footer.
 */
const WidgetSettings: React.FC<{
  /** Accessible name, "Markets settings". */
  label: string;
  count?: number;
  onReset?: () => void;
  width?: number;
  children: React.ReactNode;
}> = ({ label, count = 0, onReset, width = 232, children }) => {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const open = anchor != null;
  const close = () => setAnchor(null);
  const right = anchor ? Math.max(8, window.innerWidth - anchor.right) : 48;
  const below = anchor ? window.innerHeight - anchor.bottom - GAP - EDGE : 0;
  const above = anchor ? anchor.top - GAP - EDGE : 0;
  // Measured, not guessed: the panel mounts hanging down (through a
  // portal, so only its ref knows when it is on the page), and its full
  // content height decides, before paint, whether it stands up instead.
  const [upward, setUpward] = useState(false);
  const panel = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      setUpward(el.scrollHeight > below && above > below);
    },
    [above, below],
  );
  const place =
    upward && anchor
      ? {
          bottom: window.innerHeight - anchor.top + GAP,
          maxHeight: above,
          transformOrigin: 'bottom right',
        }
      : {
          top: anchor ? anchor.bottom + GAP : 96,
          maxHeight: below || undefined,
          transformOrigin: 'top right',
        };

  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={label}
        aria-expanded={open}
        title={count > 0 ? `${label} · ${count} in effect` : label}
        onClick={(e) => {
          if (open) return close();
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor({ top: r.top, bottom: r.bottom, right: r.right });
        }}
        sx={{
          all: 'unset',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'pointer',
          color: open || count > 0 ? 'text.primary' : 'text.disabled',
          '&:hover': { color: 'primary.main' },
        }}
      >
        <SettingsOutlinedIcon sx={{ fontSize: 14 }} />
        {count > 0 && (
          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: -5,
              right: -7,
              minWidth: 12,
              px: 0.25,
              fontFamily: FONTS.mono,
              fontSize: '0.5rem',
              lineHeight: '12px',
              textAlign: 'center',
              color: 'background.default',
              backgroundColor: 'text.primary',
            }}
          >
            {count}
          </Box>
        )}
      </Box>
      {open && (
        // The widget is transformed and scrolls, which would trap a fixed
        // scrim and blur the panel itself; both are portalled to the page.
        <Portal>
          <Box
            onClick={close}
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 1300,
              backgroundColor: (t) => alpha(t.palette.background.default, 0.6),
              backdropFilter: 'blur(3px) saturate(0.7)',
              WebkitBackdropFilter: 'blur(3px) saturate(0.7)',
              animation: `${scrimIn} 160ms ease-out`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          />
          <Box
            ref={panel}
            role="dialog"
            aria-label={label}
            sx={{
              position: 'fixed',
              ...place,
              right,
              zIndex: 1301,
              width,
              maxWidth: 'calc(100vw - 16px)',
              overflow: 'auto',
              backgroundColor: 'background.default',
              border: '1px solid',
              borderColor: 'border.light',
              px: 1.25,
              pt: 1,
              pb: 0.75,
              boxShadow: (t) =>
                t.palette.mode === 'dark'
                  ? '0 24px 48px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.4)'
                  : '0 24px 48px rgba(9, 11, 13, 0.18), 0 2px 8px rgba(9, 11, 13, 0.1)',
              animation: `${panelIn} 180ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
              fontSize: '0.75rem',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              cursor: 'default',
              textAlign: 'left',
            }}
          >
            {children}
            <Box
              sx={{
                ...settingsRowSx,
                justifyContent: 'space-between',
                borderTop: '1px solid',
                borderColor: 'divider',
                mt: 0.75,
                pt: 1,
              }}
            >
              {onReset ? (
                <Box
                  component="button"
                  type="button"
                  onClick={onReset}
                  sx={settingsLinkSx}
                >
                  reset
                </Box>
              ) : (
                <Typography component="span" sx={settingsLabelSx} />
              )}
              <Box
                component="button"
                type="button"
                onClick={close}
                sx={settingsLinkSx}
              >
                close
              </Box>
            </Box>
          </Box>
        </Portal>
      )}
    </>
  );
};

export default WidgetSettings;
