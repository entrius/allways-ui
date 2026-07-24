import React from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import { FONTS } from '../../theme';

/**
 * Bordered KPI cell — small uppercase mono label on top, big bold mono value
 * at the bottom. The one stat-tile treatment shared by the Network Stats
 * snapshot row and the miners overview row. Pass `children` instead of
 * `value` for a custom body (e.g. the swap-direction bars).
 */
const StatCell: React.FC<{
  label: string;
  value?: string;
  unit?: string;
  /** Small secondary suffix rendered after the value (e.g. "· 98% success"). */
  sub?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, unit, sub, loading, children }) => (
  <Box
    sx={{
      borderRadius: 0,
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
      p: { xs: 2, md: 2.25 },
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      justifyContent: 'space-between',
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.62rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    {children ?? (
      <Box
        sx={{
          fontFamily: FONTS.mono,
          fontSize: { xs: '1.6rem', md: '2rem' },
          fontWeight: 700,
          lineHeight: 1,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'baseline',
          gap: 0.5,
          flexWrap: 'wrap',
        }}
      >
        {loading ? (
          <Skeleton
            variant="rectangular"
            width={100}
            height={28}
            sx={{ bgcolor: 'action.hover' }}
          />
        ) : (
          <>
            {value}
            {unit && (
              <Box
                component="span"
                sx={{
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {unit}
              </Box>
            )}
            {sub && (
              <Box
                component="span"
                sx={{
                  fontSize: '0.72rem',
                  color: 'text.secondary',
                  fontWeight: 400,
                }}
              >
                {sub}
              </Box>
            )}
          </>
        )}
      </Box>
    )}
  </Box>
);

export default StatCell;
