import { type ContainerProps, Stack } from '@mui/material';
import React from 'react';

const baseTitle = 'Allways';
export type PageProps = ContainerProps & {
  title?: string;
};

const Page: React.FC<PageProps> = ({ children, title }) => {
  document.title = title ? `${baseTitle} - ${title}` : baseTitle;

  return (
    <Stack gap={2} sx={{ width: '100%', maxWidth: '100%' }}>
      {children}
    </Stack>
  );
};

export default Page;
