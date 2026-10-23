import React from 'react';
import { Stack } from '@mui/material';
import {
  Hero,
  HowItWorks,
  ValueProps,
  AgentTeaser,
  Page,
  SEO,
} from '../components';

const LandingPage: React.FC = () => {
  return (
    <Page>
      {/* Canonical entity description: keep identical to index.html,
          scripts/prerender.mjs, the Cloudflare worker and llms.txt. */}
      <SEO
        title="Allways"
        browserTitle="Allways (Bittensor Subnet 7): any asset to any asset"
        description="Allways (Bittensor Subnet 7) is a marketplace for native asset transactions: any asset to any asset, at posted exchange rates, backed by locked funds worth the full value."
      />
      <Stack sx={{ width: '100%' }}>
        <Hero />
        <HowItWorks />
        <ValueProps />
        <AgentTeaser />
      </Stack>
    </Page>
  );
};

export default LandingPage;
