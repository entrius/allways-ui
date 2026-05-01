import React from 'react';
import { Stack } from '@mui/material';
import {
  Hero,
  MetricsStrip,
  HowItWorks,
  ValueProps,
  AgentTeaser,
  Page,
  SEO,
} from '../components';

const LandingPage: React.FC = () => {
  return (
    <Page>
      <SEO
        title="Allways"
        description="Universal transaction layer. Trustless peer to peer swaps on Bittensor Subnet 7."
      />
      <Stack sx={{ width: '100%' }}>
        <Hero />
        <MetricsStrip />
        <HowItWorks />
        <ValueProps />
        <AgentTeaser />
      </Stack>
    </Page>
  );
};

export default LandingPage;
