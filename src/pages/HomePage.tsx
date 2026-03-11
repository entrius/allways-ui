import React from 'react';
import { Box } from '@mui/material';
import { Navbar, Hero, Ticker } from '../components/landing';
import { COLORS } from '../theme';

const HomePage: React.FC = () => {
  document.title = 'Allways';

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Navbar />
      <Hero />
      <Ticker />
    </Box>
  );
};

export default HomePage;
