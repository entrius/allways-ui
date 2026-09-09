import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  AgentMarkdownCard,
  SnapshotDownload,
  RateQuoteHelper,
  MoreAffordances,
  Page,
  PageIntro,
  SEO,
} from '../components';
import { PAGE_FRAME_SX } from '../components/layout/pageFrame';

// The step caption over each panel: the landing card's blue step number,
// then the step's name in the same mono.
const SectionLabel: React.FC<{ children: string }> = ({ children }) => {
  const [num, ...rest] = children.split(' · ');
  return (
    <Typography
      variant="eyebrow"
      sx={{ mb: 1.5, display: 'block', letterSpacing: '0.15em' }}
    >
      {num.padStart(2, '0')}
      <Box component="span" sx={{ color: 'text.secondary', ml: 1.5 }}>
        {rest.join(' · ')}
      </Box>
    </Typography>
  );
};

const AgentsPage: React.FC = () => {
  return (
    <Page>
      <SEO
        title="Agents"
        description="Drop-in context bundle, live snapshot, and rate quotes for AI agents using Allways."
      />
      {/* The site frame and headroom, as on Markets and Network; the lead
          runs the frame's width like the panels under it. */}
      <Box sx={PAGE_FRAME_SX}>
        <PageIntro
          eyebrow="For AI Agents"
          title="Allways for agents."
          lead="Everything an LLM needs to quote rates, swap, and watch live state on Bittensor SN7. Hand it to your agent so it can swap natively between digital assets on its own: no human in the loop, no custodian in the middle."
          leadMaxWidth="none"
        />

        <Stack spacing={{ xs: 4, md: 6 }}>
          <Box>
            <SectionLabel>
              1 · Hand off context — copy once, ingest once
            </SectionLabel>
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
