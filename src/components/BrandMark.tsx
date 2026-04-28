import React from 'react';
import { Box } from '@mui/material';
import logo from '../assets/logo.jpg';
import { useThemeMode } from '../ThemeContext';

interface Props {
  size?: number;
}

const BrandMark: React.FC<Props> = ({ size = 24 }) => {
  const { mode } = useThemeMode();
  return (
    <Box
      component="img"
      src={logo}
      alt="Allways"
      sx={{
        height: size,
        filter: mode === 'dark' ? 'invert(1)' : 'none',
        mixBlendMode: mode === 'dark' ? 'screen' : 'multiply',
      }}
    />
  );
};

export default BrandMark;
