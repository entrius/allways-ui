import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FONTS } from '../theme';

/**
 * The app's one section/card heading — uppercase mono title with an optional
 * info tooltip and a smaller secondary subtitle, as used by the stats Panel.
 * Every titled section renders through this so the treatment stays identical
 * across pages.
 */
const SectionHeading: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Plain-language explanation shown in a tooltip on the title's info icon. */
  info?: string;
}> = ({ title, subtitle, info }) => (
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
);

export default SectionHeading;
