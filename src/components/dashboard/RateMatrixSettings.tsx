import React from 'react';
import { Box, Typography } from '@mui/material';
import type { ChainInfo } from '../../api/models/chains';
import { FONTS } from '../../theme';
import {
  SettingsCheck as Check,
  SettingsSeg as Seg,
  settingsLabelSx as labelSx,
  settingsRowSx as rowSx,
} from '../workspace/WidgetSettings';
import {
  HEADER_PRESETS,
  sameParts,
  type HeaderParts,
  type MatrixSettings,
} from './matrixSettings';

// Port of allways-matrix SettingsPanel: the rows of the Markets widget's
// settings panel (the gear in its title row). Label parts, favorites-only,
// and a row per asset with a show/hide box and a star. The panel chrome is
// the desk's shared WidgetSettings.

const PARTS: { key: keyof HeaderParts; label: string; example: string }[] = [
  { key: 'logo', label: 'logo', example: '◉' },
  { key: 'ticker', label: 'ticker', example: 'USDC' },
  { key: 'network', label: 'network', example: 'Base' },
];

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
}> = ({ assets, settings, update, toggleHidden, toggleFavorite }) => (
  <>
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
  </>
);

export default RateMatrixSettings;
