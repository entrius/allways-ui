import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { FONTS } from '../theme';

interface QueryErrorProps {
  onRetry: () => void;
  title?: string;
}

export const QueryError: React.FC<QueryErrorProps> = ({
  onRetry,
  title = 'Failed to load data',
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'error.main',
        backgroundColor: 'background.paper',
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'error.main',
          mb: 2,
        }}
      >
        {title}
      </Typography>
      <Button
        onClick={onRetry}
        size="small"
        variant="outlined"
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderRadius: 0,
          borderColor: 'primary.main',
          color: 'primary.main',
          '&:hover': {
            backgroundColor: `${theme.palette.primary.main}11`,
          },
        }}
      >
        Retry
      </Button>
    </Box>
  );
};
