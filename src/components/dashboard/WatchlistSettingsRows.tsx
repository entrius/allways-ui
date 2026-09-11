import React from 'react';
import { Box, Typography } from '@mui/material';
import { useChains } from '../../api';
import { hubChains } from '../../api/models/chains';
import { chainSymbol } from '../../utils/format';
import {
  SettingsCheck as Check,
  SettingsSeg as Seg,
  settingsLabelSx as labelSx,
  settingsRowSx as rowSx,
} from '../workspace/WidgetSettings';
import {
  ALL_HUBS,
  COLUMNS,
  type Column,
  type Directions,
  type WatchlistSettings,
} from './watchlistSettings';

export const COLUMN_LABELS: Record<Column, { label: string; note: string }> = {
  spread: { label: 'Spread', note: 'gap to the way back' },
  depth: { label: 'Depth', note: 'takeable size' },
  vol: { label: 'Vol', note: 'settled in the window' },
  swaps: { label: 'Swaps', note: 'settled count' },
  quotes: { label: 'Quotes', note: 'miners quoting' },
  chg: { label: 'Chg%', note: 'move over the window' },
};

const DIRECTIONS: { value: Directions; label: string; note: string }[] = [
  {
    value: 'both',
    label: 'both',
    note: 'Every route, both ways: each pair twice.',
  },
  {
    value: 'from',
    label: 'from hub',
    note: 'One row per pair: what 1 unit of the hub sends.',
  },
  {
    value: 'to',
    label: 'to hub',
    note: 'One row per pair: what arrives at the hub.',
  },
];

// The rows of the Watchlist widget's settings panel (the gear in its title
// row): which hub's network the list shows, and whether a pair appears
// once or in both directions.
const WatchlistSettingsRows: React.FC<{
  settings: WatchlistSettings;
  update: (patch: Partial<WatchlistSettings>) => void;
}> = ({ settings, update }) => {
  const { data: chains } = useChains();
  const hubs = hubChains(chains);
  return (
    <>
      <Typography component="div" sx={{ ...labelSx, pt: 0.25, pb: 0.25 }}>
        hub
      </Typography>
      <Box sx={rowSx}>
        <Seg
          left
          options={[
            { value: ALL_HUBS, label: 'all' },
            ...hubs.map((h) => ({ value: h, label: chainSymbol(h) })),
          ]}
          value={settings.scope}
          onChange={(scope) => update({ scope })}
        />
      </Box>
      <Typography
        component="div"
        sx={{ fontSize: '0.62rem', color: 'text.disabled', pb: 0.25 }}
      >
        {settings.scope === ALL_HUBS
          ? 'Every route, filed under the hub that settles it.'
          : `Only routes on the ${chainSymbol(settings.scope)} network.`}
      </Typography>

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
        directions
      </Typography>
      <Box sx={rowSx}>
        <Seg
          left
          options={DIRECTIONS.map((d) => ({ value: d.value, label: d.label }))}
          value={settings.directions}
          onChange={(v) => update({ directions: v as Directions })}
        />
      </Box>
      <Typography
        component="div"
        sx={{ fontSize: '0.62rem', color: 'text.disabled', pb: 0.25 }}
      >
        {DIRECTIONS.find((d) => d.value === settings.directions)?.note}
      </Typography>

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
        columns
      </Typography>
      {COLUMNS.map((c) => (
        <Box key={c} sx={rowSx}>
          <Check
            checked={settings.columns[c]}
            onChange={() =>
              update({
                columns: { ...settings.columns, [c]: !settings.columns[c] },
              })
            }
          >
            <span>{COLUMN_LABELS[c].label}</span>
          </Check>
          <Typography
            component="span"
            sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
          >
            {COLUMN_LABELS[c].note}
          </Typography>
        </Box>
      ))}
    </>
  );
};

export default WatchlistSettingsRows;
