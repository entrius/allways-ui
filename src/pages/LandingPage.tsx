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
      <SEO
        title="Allways"
        description="Choose what you send, what arrives, and where it lands. Delivery guaranteed. Bittensor Subnet 7."
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
