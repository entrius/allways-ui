import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  SettingsCheck as Check,
  settingsLabelSx as labelSx,
  settingsRowSx as rowSx,
} from '../workspace/WidgetSettings';
import { RATE_STATS, type RateStat, type RateSettings } from './rateSettings';

export const RATE_STAT_LABELS: Record<
  RateStat,
  { label: string; note: string }
> = {
  high: { label: 'High', note: 'window high' },
  low: { label: 'Low', note: 'window low' },
  spread: { label: 'Spread', note: 'gap to the way back' },
  reverse: { label: 'Reverse', note: "the way back's rate" },
  depth: { label: 'Depth', note: 'takeable size' },
  quotes: { label: 'Quotes', note: 'miners quoting' },
  vol: { label: 'Vol', note: 'settled in the window' },
  swaps: { label: 'Swaps', note: 'settled count' },
};

// The rows of the Rate widget's settings panel (the gear in its title
// row): which facts the ribbon under the headline shows.
const RateSettingsRows: React.FC<{
  settings: RateSettings;
  update: (patch: Partial<RateSettings>) => void;
}> = ({ settings, update }) => (
  <>
    <Typography component="div" sx={{ ...labelSx, pt: 0.25, pb: 0.25 }}>
      stats
    </Typography>
    {RATE_STATS.map((k) => (
      <Box key={k} sx={rowSx}>
        <Check
          checked={settings.stats[k]}
          onChange={() =>
            update({ stats: { ...settings.stats, [k]: !settings.stats[k] } })
          }
        >
          <span>{RATE_STAT_LABELS[k].label}</span>
        </Check>
        <Typography
          component="span"
          sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
        >
          {RATE_STAT_LABELS[k].note}
        </Typography>
      </Box>
    ))}
  </>
);

export default RateSettingsRows;
