import React from 'react';
import { Box } from '@mui/material';
import { PageIntro, TextLinkButton } from '../components';
import { PAGE_FRAME_SX } from '../components/layout/pageFrame';

const NotFoundPage: React.FC = () => (
  <Box sx={{ ...PAGE_FRAME_SX, py: { xs: 6, md: 10 } }}>
    <PageIntro
      eyebrow="404"
      title="Page not found."
      lead="Nothing lives at this address. The markets, the network and the agent tools are one click away."
      mb={{ xs: 3, md: 4 }}
    />
    <TextLinkButton href="/" arrow>
      Back to home
    </TextLinkButton>
  </Box>
);

export default NotFoundPage;
