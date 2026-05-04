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
        description="Trustless peer to peer transactions on Bittensor Subnet 7."
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
