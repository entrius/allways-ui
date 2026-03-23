import React from 'react';
import {
  Grid,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { FONTS } from '../../theme';

const cardBorder = {
  borderRadius: 0,
  backgroundColor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
};

export const StatsPanelSkeleton: React.FC = () => (
  <Grid container spacing={1.5}>
    {[0, 1, 2, 3].map((i) => (
      <Grid item xs={12} sm={6} md={3} key={i}>
        <Stack sx={{ ...cardBorder, p: 2.5, alignItems: 'center' }}>
          <Skeleton
            variant="text"
            width={60}
            height={32}
            sx={{ borderRadius: 0 }}
          />
          <Skeleton
            variant="text"
            width={90}
            height={14}
            sx={{ mt: 0.5, borderRadius: 0 }}
          />
        </Stack>
      </Grid>
    ))}
  </Grid>
);

const tableHeaderSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.65rem',
  color: 'text.secondary',
  borderBottom: '1px solid',
  borderColor: 'divider',
  backgroundColor: 'background.default',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

export const MinerRatesTableSkeleton: React.FC = () => (
  <Stack>
    <Skeleton
      variant="text"
      width={180}
      height={28}
      sx={{ mb: 2, borderRadius: 0 }}
    />
    <Skeleton
      variant="rectangular"
      width="100%"
      height={36}
      sx={{ mb: 1.5, borderRadius: 0 }}
    />
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['UID', 'Pair', 'Rate', 'Capacity', 'Status', 'Hotkey'].map(
              (h) => (
                <TableCell key={h} sx={tableHeaderSx}>
                  {h}
                </TableCell>
              ),
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              {[30, 60, 50, 50, 70, 80].map((w, j) => (
                <TableCell
                  key={j}
                  sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Skeleton
                    variant="text"
                    width={w}
                    height={16}
                    sx={{ borderRadius: 0 }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
);

export const OrderbookDepthSkeleton: React.FC = () => (
  <Stack>
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <Skeleton
        variant="text"
        width={150}
        height={28}
        sx={{ borderRadius: 0 }}
      />
      <Skeleton
        variant="rectangular"
        width={140}
        height={32}
        sx={{ borderRadius: 0 }}
      />
    </Stack>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['Rate (TAO)', 'Capacity', 'Asset → TAO', 'TAO → Asset'].map(
              (h) => (
                <TableCell key={h} sx={tableHeaderSx}>
                  {h}
                </TableCell>
              ),
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              {[50, 50, 70, 60].map((w, j) => (
                <TableCell
                  key={j}
                  sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Skeleton
                    variant="text"
                    width={w}
                    height={16}
                    sx={{ borderRadius: 0 }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
);

export const EventFeedSkeleton: React.FC = () => (
  <Stack>
    <Skeleton
      variant="text"
      width={120}
      height={28}
      sx={{ mb: 2, borderRadius: 0 }}
    />
    <Stack spacing={1}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Stack
          key={i}
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Skeleton
            variant="rectangular"
            width={80}
            height={22}
            sx={{ borderRadius: 0 }}
          />
          <Stack sx={{ flex: 1 }} spacing={0.5}>
            <Skeleton
              variant="text"
              width="60%"
              height={14}
              sx={{ borderRadius: 0 }}
            />
            <Skeleton
              variant="text"
              width="40%"
              height={12}
              sx={{ borderRadius: 0 }}
            />
          </Stack>
          <Skeleton
            variant="text"
            width={50}
            height={12}
            sx={{ borderRadius: 0 }}
          />
        </Stack>
      ))}
    </Stack>
  </Stack>
);

export const SwapTrackerSkeleton: React.FC = () => (
  <Stack>
    <Skeleton
      variant="text"
      width={120}
      height={28}
      sx={{ mb: 2, borderRadius: 0 }}
    />
    <Stack spacing={1.5}>
      {[0, 1, 2, 3].map((i) => (
        <Stack
          key={i}
          sx={{
            p: 2,
            ...cardBorder,
          }}
          spacing={1}
        >
          <Stack direction="row" justifyContent="space-between">
            <Skeleton
              variant="text"
              width={80}
              height={16}
              sx={{ borderRadius: 0 }}
            />
            <Skeleton
              variant="rectangular"
              width={70}
              height={20}
              sx={{ borderRadius: 0 }}
            />
          </Stack>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={6}
            sx={{ borderRadius: 0 }}
          />
          <Stack direction="row" spacing={2}>
            <Skeleton
              variant="text"
              width={100}
              height={12}
              sx={{ borderRadius: 0 }}
            />
            <Skeleton
              variant="text"
              width={100}
              height={12}
              sx={{ borderRadius: 0 }}
            />
          </Stack>
        </Stack>
      ))}
    </Stack>
  </Stack>
);
