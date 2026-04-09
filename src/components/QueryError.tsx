import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { FONTS } from '../theme';

const QueryError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <Box
    sx={{
      p: 4,
      textAlign: 'center',
      borderRadius: 0,
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.8rem',
        color: 'text.secondary',
        mb: onRetry ? 1.5 : 0,
      }}
    >
      Failed to load data
    </Typography>
    {onRetry && (
      <Button
        onClick={onRetry}
        size="small"
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          borderRadius: 0,
          textTransform: 'none',
        }}
      >
        Retry
      </Button>
    )}
  </Box>
);

export default QueryError;
