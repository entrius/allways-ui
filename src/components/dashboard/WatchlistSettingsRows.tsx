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
import { ALL_HUBS, type WatchlistSettings } from './watchlistSettings';

// The rows of the Watchlist widget's settings panel (the gear in its title
// row): which hub's network the list shows.
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
    </>
  );
};

export default WatchlistSettingsRows;
