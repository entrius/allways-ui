import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import type { ChainInfo } from '../../api/models/chains';
import { FONTS } from '../../theme';
import {
  HEADER_PRESETS,
  sameParts,
  type HeaderParts,
  type MatrixSettings,
} from './matrixSettings';

// Port of allways-matrix SettingsPanel: a compact popover under the corner
// cell. Theme, label parts, favorites-only, and a row per asset with a
// show/hide box and a star. The sheet drops back behind a blurred scrim and
// the panel comes forward on a shadow.

const PARTS: { key: keyof HeaderParts; label: string; example: string }[] = [
  { key: 'logo', label: 'logo', example: '◉' },
  { key: 'ticker', label: 'ticker', example: 'USDC' },
  { key: 'network', label: 'network', example: 'Base' },
];

const scrimIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const panelIn = keyframes`
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: none; }
`;

const labelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.62rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
} as const;

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 0.5,
} as const;

const linkSx = {
  all: 'unset',
  cursor: 'pointer',
  fontFamily: FONTS.mono,
  fontSize: '0.6rem',
  color: 'text.secondary',
  '&:hover': { color: 'text.primary' },
} as const;

// Segmented control: one bordered strip of text buttons, the active one
// filled in the text colour.
const Seg: React.FC<{
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

const Check: React.FC<{
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

const Star: React.FC<{ on: boolean; onClick: () => void }> = ({
  on,
  onClick,
}) => (
  <Box
    component="button"
    type="button"
    title={on ? 'unstar' : 'star'}
    onClick={onClick}
    sx={{
      all: 'unset',
      cursor: 'pointer',
      ml: 'auto',
      fontSize: 12,
      lineHeight: 1,
      color: on ? '#e8b923' : 'border.light',
      '&:hover': { color: on ? '#e8b923' : 'text.secondary' },
    }}
  >
    ★
  </Box>
);

const RateMatrixSettings: React.FC<{
  assets: ChainInfo[];
  settings: MatrixSettings;
  update: (patch: Partial<MatrixSettings>) => void;
  toggleHidden: (id: string) => void;
  toggleFavorite: (id: string) => void;
  reset: () => void;
  onClose: () => void;
  /** Height of the pinned header row the panel hangs under. */
  top: number;
}> = ({
  assets,
  settings,
  update,
  toggleHidden,
  toggleFavorite,
  reset,
  onClose,
  top,
}) => {
  return (
    <>
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 4,
          backgroundColor: (t) => alpha(t.palette.background.default, 0.6),
          backdropFilter: 'blur(3px) saturate(0.7)',
          WebkitBackdropFilter: 'blur(3px) saturate(0.7)',
          animation: `${scrimIn} 160ms ease-out`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
      <Box
        role="dialog"
        aria-label="settings"
        sx={{
          position: 'absolute',
          top,
          left: 0,
          zIndex: 5,
          width: 232,
          maxHeight: `calc(100dvh - ${top}px - 72px)`,
          overflow: 'auto',
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: 'border.light',
          borderTop: 'none',
          px: 1.25,
          pt: 1,
          pb: 0.75,
          boxShadow: (t) =>
            t.palette.mode === 'dark'
              ? '0 24px 48px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.4)'
              : '0 24px 48px rgba(9, 11, 13, 0.18), 0 2px 8px rgba(9, 11, 13, 0.1)',
          transformOrigin: 'top left',
          animation: `${panelIn} 180ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          fontSize: '0.75rem',
          fontWeight: 400,
          whiteSpace: 'nowrap',
          cursor: 'default',
          textAlign: 'left',
        }}
      >
        <Typography component="div" sx={{ ...labelSx, pt: 0.25, pb: 0.25 }}>
          labels
        </Typography>
        <Box sx={rowSx}>
          <Seg
            left
            options={HEADER_PRESETS.map((p) => ({
              value: p.name,
              label: p.name,
            }))}
            value={
              HEADER_PRESETS.find((p) => sameParts(settings.header, p.parts))
                ?.name ?? ''
            }
            onChange={(name) => {
              const preset = HEADER_PRESETS.find((p) => p.name === name);
              if (preset) update({ header: preset.parts });
            }}
          />
        </Box>
        {PARTS.map((part) => (
          <Box key={part.key} sx={rowSx}>
            <Check
              checked={settings.header[part.key]}
              onChange={() =>
                update({
                  header: {
                    ...settings.header,
                    [part.key]: !settings.header[part.key],
                  },
                })
              }
            >
              <span>{part.label}</span>
            </Check>
            <Typography
              component="span"
              sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
            >
              {part.example}
            </Typography>
          </Box>
        ))}

        <Typography
          component="div"
          sx={{
            ...labelSx,
            pt: 1,
            pb: 0.25,
            mt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          view
        </Typography>
        <Box sx={rowSx}>
          <Check
            checked={settings.favoritesOnly}
            onChange={() => update({ favoritesOnly: !settings.favoritesOnly })}
          >
            <span>favorites only</span>
          </Check>
          <Typography
            component="span"
            sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
          >
            {settings.favorites.length
              ? `${settings.favorites.length} starred`
              : 'none starred'}
          </Typography>
        </Box>

        <Typography
          component="div"
          sx={{
            ...labelSx,
            pt: 1,
            pb: 0.25,
            mt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          rows
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {assets.map((a) => {
            const shown = !settings.hidden.includes(a.id);
            const fav = settings.favorites.includes(a.id);
            return (
              <Box
                component="li"
                key={a.id}
                sx={{ display: 'flex', alignItems: 'center', py: 0.375 }}
              >
                <Check checked={shown} onChange={() => toggleHidden(a.id)}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: shown ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {a.symbol}
                  </Typography>
                  {a.network && (
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.6rem',
                        color: shown ? 'text.secondary' : 'text.disabled',
                      }}
                    >
                      {a.network}
                    </Typography>
                  )}
                </Check>
                <Star on={fav} onClick={() => toggleFavorite(a.id)} />
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            ...rowSx,
            justifyContent: 'space-between',
            borderTop: '1px solid',
            borderColor: 'divider',
            mt: 0.75,
            pt: 1,
          }}
        >
          <Box component="button" type="button" onClick={reset} sx={linkSx}>
            reset
          </Box>
          <Box component="button" type="button" onClick={onClose} sx={linkSx}>
            close
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default RateMatrixSettings;
