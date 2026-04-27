import React, { useEffect, useRef, useState } from 'react';
import { Box, Grid, Tooltip, Typography, keyframes } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useStats } from '../../api';
import { FONTS } from '../../theme';
import { StatsPanelSkeleton } from './Skeletons';

const slideOut = keyframes`
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(-100%); opacity: 0; }
`;

const slideIn = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
`;

const RollingChar: React.FC<{ char: string }> = ({ char }) => {
  const [display, setDisplay] = useState(char);
  const [animating, setAnimating] = useState(false);
  const prevRef = useRef(char);
  const prevDisplay = useRef(char);

  useEffect(() => {
    if (char !== prevRef.current) {
      prevDisplay.current = prevRef.current;
      prevRef.current = char;
      setAnimating(true);
      const t = setTimeout(() => {
        setDisplay(char);
        setAnimating(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [char]);

  return (
    <Box
      sx={{
        display: 'inline-block',
        position: 'relative',
        width: /[0-9]/.test(char) ? '0.85em' : char === '.' ? '0.4em' : '0.5em',
        height: '1.2em',
        overflow: 'hidden',
        verticalAlign: 'bottom',
      }}
    >
      {animating && (
        <Box
          key={`out-${prevDisplay.current}`}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `${slideOut} 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          }}
        >
          {prevDisplay.current}
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(animating
            ? {
                animation: `${slideIn} 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              }
            : {}),
        }}
      >
        {display}
      </Box>
    </Box>
  );
};

const RollingValue: React.FC<{ value: string }> = ({ value }) => {
  const chars = value.split('');
  return (
    <Box sx={{ display: 'inline-flex', justifyContent: 'center' }}>
      {chars.map((c, i) => (
        <RollingChar key={`${chars.length}-${i}`} char={c} />
      ))}
    </Box>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  hint: string;
}> = ({ label, value, hint }) => (
  <Box
    sx={{
      p: 2.5,
      borderRadius: 0,
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      textAlign: 'center',
      position: 'relative',
    }}
  >
    <Tooltip title={hint} arrow placement="top">
      <Box
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          color: 'text.disabled',
          display: 'inline-flex',
          cursor: 'default',
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
      </Box>
    </Tooltip>
    <Box
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'primary.main',
        lineHeight: 1.2,
      }}
    >
      <RollingValue value={value} />
    </Box>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.65rem',
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        mt: 0.5,
      }}
    >
      {label}
    </Typography>
  </Box>
);

const StatsPanel: React.FC = () => {
  const { data: stats, isLoading } = useStats();

  const volume = stats ? parseFloat(stats.totalVolumeTao).toFixed(2) : '0';

  return isLoading || !stats ? (
    <StatsPanelSkeleton />
  ) : (
    <Grid container spacing={1.5}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="Successful Swaps"
          value={String(stats.totalSwaps)}
          hint="All-time count of swaps that completed successfully on-chain."
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="Volume (TAO)"
          value={volume}
          hint="All-time TAO volume across every completed swap. Counts the TAO leg regardless of swap direction."
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="Active Miners"
          value={String(stats.activeMiners)}
          hint="Miners currently registered as active on the network — they are posting rates and ready to fulfill swaps."
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="Active Swaps"
          value={String(stats.activeSwaps)}
          hint="Swaps in flight right now — initiated by a user but not yet completed or timed out."
        />
      </Grid>
    </Grid>
  );
};

export default StatsPanel;
