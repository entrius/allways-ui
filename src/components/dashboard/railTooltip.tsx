import React from 'react';
import { Tooltip, type TooltipProps } from '@mui/material';

// One tooltip for the whole market rail, so hints read as a set rather than
// as whatever each call site happened to pass.
//
// Rules the default Tooltip gets wrong here:
//   - It grows to fit its text, and the rail's copy was long enough to cover
//     the very card being explained. Width is capped and placement defaults
//     to the left, out over the chart, where there is room to spare.
//   - It fires instantly on a dense grid of rows and logos, so the pointer
//     drags a trail of popups across the map. A short delay means only a
//     deliberate hover asks a question.
// Copy is kept to a sentence or two: a hint, not documentation.
const RailTooltip: React.FC<TooltipProps> = ({ children, ...props }) => (
  <Tooltip
    arrow
    placement="left"
    enterDelay={350}
    enterNextDelay={150}
    componentsProps={{
      tooltip: {
        sx: {
          maxWidth: 210,
          fontSize: '0.68rem',
          fontWeight: 400,
          lineHeight: 1.45,
          px: 1,
          py: 0.75,
        },
      },
    }}
    {...props}
  >
    {children}
  </Tooltip>
);

export default RailTooltip;
