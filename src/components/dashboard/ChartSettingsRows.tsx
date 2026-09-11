import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  SettingsCheck as Check,
  settingsLabelSx as labelSx,
  settingsNoteSx,
  settingsRowSx as rowSx,
} from '../workspace/WidgetSettings';
import type { ChartSettings } from './chartSettings';

// The rows of the History widget's settings panel (the gear in its title
// row): whether the window's O / H / L / C readout sits above the line.
const ChartSettingsRows: React.FC<{
  settings: ChartSettings;
  update: (patch: Partial<ChartSettings>) => void;
}> = ({ settings, update }) => (
  <>
    <Typography component="div" sx={{ ...labelSx, pt: 0.25, pb: 0.25 }}>
      readout
    </Typography>
    <Box sx={rowSx}>
      <Check
        checked={settings.readout}
        onChange={() => update({ readout: !settings.readout })}
      >
        <span>O / H / L / C</span>
      </Check>
      <Typography
        component="span"
        sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
      >
        {settings.readout ? 'shown' : 'hidden'}
      </Typography>
    </Box>
    <Typography component="div" sx={settingsNoteSx}>
      The window's open, high, low and close, and its change.
    </Typography>
  </>
);

export default ChartSettingsRows;
