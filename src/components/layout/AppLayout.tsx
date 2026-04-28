import React, { Suspense, useRef } from 'react';
import { Stack } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useOnNavigate } from '../../hooks';
import LoadingPage from '../../pages/LoadingPage';
import { TopNav, Footer } from '../nav';

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));

  return (
    <Stack
      sx={{
        width: '100vw',
        minHeight: '100vh',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <TopNav />
      <Stack
        ref={mainRef}
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <Suspense fallback={<LoadingPage />}>
          <Outlet />
        </Suspense>
        <Footer />
      </Stack>
    </Stack>
  );
};

export default AppLayout;
