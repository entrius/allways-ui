import React from 'react';
import { Box } from '@mui/material';
import SectionHeading from '../SectionHeading';

/**
 * Bordered stat/chart card used across the stats-style pages (Network Stats,
 * Miners crown rate) so they share one visual language: uppercase mono title,
 * optional info tooltip, optional subtitle, content below.
 */
const Panel: React.FC<{
  title: string;
  subtitle?: string;
  /** Plain-language explanation shown in a tooltip on the title's info icon. */
  info?: string;
  /** Right-aligned header content (e.g. a live value readout). */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, info, headerRight, children }) => (
  <Box
    sx={{
      height: '100%',
      borderRadius: 0,
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
      p: { xs: 2, md: 2.5 },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      {/* The heading takes the room that is left, so a readout stays on the
          title line; only wide header controls wrap below on a phone. */}
      <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
        <SectionHeading title={title} subtitle={subtitle} info={info} />
      </Box>
      {headerRight && <Box sx={{ flexShrink: 0 }}>{headerRight}</Box>}
    </Box>
    {children}
  </Box>
);

export default Panel;
