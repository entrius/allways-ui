import React from 'react';
import { Box } from '@mui/material';
import { AssetMark } from './ChainLogo';

// A trade as a display title: each leg's asset mark before its amount, an
// arrow between. Sized in em so it follows the title it sits in.
const Leg: React.FC<{ chain: string | null; text: React.ReactNode }> = ({
  chain,
  text,
}) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: { xs: 0.75, md: 1.25 },
      verticalAlign: 'middle',
    }}
  >
    {chain && (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          flexShrink: 0,
          // Sized to the title: the mark and its network badge scale together.
          '& > span': { width: '0.8em', height: '0.8em' },
          '& > span > img': { width: '100%', height: '100%' },
        }}
      >
        <AssetMark chain={chain} size={32} />
      </Box>
    )}
    <span>{text}</span>
  </Box>
);

const TradeTitle: React.FC<{
  fromChain: string | null;
  from: React.ReactNode;
  toChain: string | null;
  to: React.ReactNode;
}> = ({ fromChain, from, toChain, to }) => (
  <>
    <Leg chain={fromChain} text={from} />
    <Box
      component="span"
      sx={{
        color: 'text.disabled',
        mx: { xs: 1, md: 1.5 },
        verticalAlign: 'middle',
      }}
    >
      →
    </Box>
    <Leg chain={toChain} text={to} />
  </>
);

export default TradeTitle;
