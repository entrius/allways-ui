import React from 'react';
import { Box, Typography } from '@mui/material';
import { useChains } from '../../api';
import { hubChains } from '../../api/models/chains';
import { chainSymbol } from '../../utils/format';
import {
  SettingsSeg as Seg,
  settingsLabelSx as labelSx,
  settingsRowSx as rowSx,
} from '../workspace/WidgetSettings';
import {
  ALL_HUBS,
  type Directions,
  type WatchlistSettings,
} from './watchlistSettings';

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
    </>
  );
};

export default WatchlistSettingsRows;
