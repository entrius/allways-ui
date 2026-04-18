import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { FONTS } from '../theme';

interface QueryErrorProps {
  onRetry?: () => void;
  message?: string;
}

const QueryError: React.FC<QueryErrorProps> = ({
  onRetry,
  message = 'Failed to load data',
}) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    gap={1.5}
    sx={{ py: 4, px: 2, minHeight: 120 }}
  >
    <ErrorOutlineIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.8rem',
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textAlign: 'center',
      }}
    >
      {message}
    </Typography>
    {onRetry && (
      <Button
        variant="outlined"
        size="small"
        onClick={onRetry}
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderColor: 'divider',
          color: 'text.primary',
          '&:hover': { borderColor: 'text.secondary' },
        }}
      >
        Retry
      </Button>
    )}
  </Stack>
);

export default QueryError;
