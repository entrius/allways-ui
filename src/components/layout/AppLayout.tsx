import React, { Suspense, useRef } from 'react';
import { Stack } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useOnNavigate } from '../../hooks';
import LoadingPage from '../../pages/LoadingPage';

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));

  return (
    <Stack
      sx={{
        width: '100vw',
        minHeight: '100dvh',
        height: '100dvh',
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.currentTarget.style.position = 'fixed';
          e.currentTarget.style.left = '8px';
          e.currentTarget.style.top = '8px';
          e.currentTarget.style.width = 'auto';
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.overflow = 'visible';
          e.currentTarget.style.zIndex = '9999';
          e.currentTarget.style.padding = '8px 16px';
          e.currentTarget.style.background = '#000';
          e.currentTarget.style.color = '#fff';
        }}
        onBlur={(e) => {
          e.currentTarget.style.position = 'absolute';
          e.currentTarget.style.left = '-9999px';
          e.currentTarget.style.width = '1px';
          e.currentTarget.style.height = '1px';
          e.currentTarget.style.overflow = 'hidden';
        }}
      >
        Skip to main content
      </a>
      <Stack
        id="main-content"
        ref={mainRef}
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Suspense fallback={<LoadingPage />}>
          <Outlet />
        </Suspense>
      </Stack>
    </Stack>
  );
};

export default AppLayout;
