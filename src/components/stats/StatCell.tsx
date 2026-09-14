import React from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import { FONTS } from '../../theme';

/**
 * Bordered KPI cell — small uppercase mono label on top, the value beneath
 * at the scale's one headline size (mono 1.4rem, weight 700). The one
 * stat-tile treatment, used by the Network Stats totals row. Pass `children`
 * instead of `value` for a custom body.
 */
const StatCell: React.FC<{
  label: string;
  value?: string;
  unit?: string;
  /** Multi-denomination readout ("12.34 SOL + 5.00 TAO") — used instead of
   * value/unit for per-backing stats. Entries are never summed. */
  segments?: { value: string; unit: string }[];
  /** Small secondary suffix rendered after the value (e.g. "· 98% success"). */
  sub?: React.ReactNode;
  /** Hover title — e.g. the canonical per-backing figures behind a USD value. */
  tooltip?: string;
  loading?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, unit, segments, sub, tooltip, loading, children }) => (
  <Box
    title={tooltip}
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
          fontSize: '1.4rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
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
            height={22}
            sx={{ bgcolor: 'action.hover' }}
          />
        ) : (
          <>
            {(segments ?? [{ value: value ?? '', unit }]).map((seg, i) => (
              <React.Fragment key={seg.unit ?? i}>
                {i > 0 && (
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.85rem',
                      color: 'text.disabled',
                      fontWeight: 500,
                    }}
                  >
                    +
                  </Box>
                )}
                {seg.value}
                {seg.unit && (
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.85rem',
                      color: 'text.secondary',
                      fontWeight: 500,
                    }}
                  >
                    {seg.unit}
                  </Box>
                )}
              </React.Fragment>
            ))}
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
