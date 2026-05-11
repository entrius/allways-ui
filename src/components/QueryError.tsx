import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { FONTS } from '../theme';

interface QueryErrorProps {
  /**
   * Optional one-line description of what failed to load. Falls back to a
   * generic "Couldn't load data" message.
   */
  label?: string;
  /**
   * Called when the user clicks Retry. Pass the consumer's `refetch` from
   * react-query.
   */
  onRetry: () => void;
}

const QueryError: React.FC<QueryErrorProps> = ({
  label = "Couldn't load data",
  onRetry,
}) => (
  <Stack
    role="alert"
    spacing={1.5}
    alignItems="center"
    sx={{
      p: 3,
      borderRadius: 0,
      backgroundColor: 'surface.light',
      border: '1px solid',
      borderColor: 'divider',
      color: 'text.secondary',
    }}
  >
    <ErrorOutlineIcon
      fontSize="small"
      sx={{ color: 'status.timedOut' }}
      aria-hidden
    />
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.8rem',
        textAlign: 'center',
      }}
    >
      {label}
    </Typography>
    <Button
      size="small"
      variant="outlined"
      onClick={onRetry}
      startIcon={<RefreshIcon fontSize="small" />}
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        textTransform: 'none',
      }}
    >
      Retry
    </Button>
  </Stack>
);

export default QueryError;
