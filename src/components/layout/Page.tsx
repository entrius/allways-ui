import { type ContainerProps, Stack } from '@mui/material';
import React from 'react';

export type PageProps = ContainerProps & {
  /** Unused: every page sets its <title> through <SEO> (react-helmet). */
  title?: string;
};

// The document title is owned by <SEO>. Writing document.title here during
// render raced Helmet and, on pages that re-render with live data (Markets),
// reset the title to plain "Allways".
const Page: React.FC<PageProps> = ({ children }) => {
  return (
    <Stack gap={2} sx={{ width: '100%', maxWidth: '100%' }}>
      {children}
    </Stack>
  );
};

export default Page;
