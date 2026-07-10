import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FONTS } from '../../theme';

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
        gap: 1,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          {info && (
            <Tooltip title={info} arrow enterTouchDelay={0}>
              <InfoOutlinedIcon
                sx={{
                  fontSize: '0.85rem',
                  color: 'text.disabled',
                  cursor: 'help',
                  '&:hover': { color: 'text.secondary' },
                }}
              />
            </Tooltip>
          )}
        </Box>
        {subtitle && (
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              color: 'text.secondary',
              mt: 0.25,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {headerRight}
    </Box>
    {children}
  </Box>
);

export default Panel;
