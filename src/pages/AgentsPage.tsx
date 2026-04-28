import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useSSE } from '../hooks';
import {
  AgentMarkdownCard,
  SnapshotDownload,
  RateQuoteHelper,
  MoreAffordances,
  Page,
  SEO,
} from '../components';
import { FONTS } from '../theme';

const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <Typography
    sx={{
      fontFamily: FONTS.mono,
      fontSize: '0.7rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      mb: 1.25,
    }}
  >
    {children}
  </Typography>
);

const AgentsPage: React.FC = () => {
  useSSE();

  return (
    <Page>
      <SEO
        title="Agents"
        description="Drop-in context bundle, live snapshot, and rate quotes for AI agents using Allways."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 1100,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 4, md: 8 },
        }}
      >
        <Stack spacing={1.5} sx={{ mb: { xs: 4, md: 6 } }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'primary.main',
            }}
          >
            For AI Agents
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.heading,
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: '-0.04em',
              textTransform: 'uppercase',
              lineHeight: 0.95,
            }}
          >
            Allways for agents.
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: { xs: '0.95rem', md: '1.1rem' },
              color: 'text.secondary',
              maxWidth: 640,
              lineHeight: 1.55,
            }}
          >
            Everything an LLM needs to quote rates, swap, and watch live state
            on Bittensor SN7. Copy. Paste. Ship.
          </Typography>
        </Stack>

        <Stack spacing={4}>
          <Box>
            <SectionLabel>1 · Hand off context</SectionLabel>
            <AgentMarkdownCard />
          </Box>

          <Box>
            <SectionLabel>2 · Bootstrap with live state</SectionLabel>
            <SnapshotDownload />
          </Box>

          <Box>
            <SectionLabel>3 · Quote against the orderbook</SectionLabel>
            <RateQuoteHelper />
          </Box>

          <Box>
            <SectionLabel>4 · Deeper integrations</SectionLabel>
            <MoreAffordances />
          </Box>
        </Stack>
      </Box>
    </Page>
  );
};

export default AgentsPage;
