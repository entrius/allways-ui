import type { Theme } from '@mui/material/styles';

type StatusPalette = Theme['palette']['status'];

export const getStatusColor = (
  status: string,
  palette: { status: StatusPalette },
): string => {
  const map: Record<string, string> = {
    ACTIVE: palette.status.active,
    FULFILLED: palette.status.fulfilled,
    COMPLETED: palette.status.completed,
    TIMED_OUT: palette.status.timedOut,
  };
  return map[status] ?? palette.status.active;
};
