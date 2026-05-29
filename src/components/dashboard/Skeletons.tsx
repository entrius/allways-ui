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
  backgroundColor: 'surface.light',
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
  <Stack sx={{ height: '100%' }}>
    {/* Eyebrow heading */}
    <Skeleton
      variant="text"
      width={90}
      height={14}
      sx={{ mb: 1.25, borderRadius: 0 }}
    />
    {/* Search + Open/Active/All filter */}
    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
      <Skeleton
        variant="rectangular"
        height={32}
        sx={{ flex: 1, borderRadius: 0 }}
      />
      <Skeleton
        variant="rectangular"
        width={130}
        height={32}
        sx={{ borderRadius: 0 }}
      />
    </Stack>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['UID', 'Rate', 'Capacity', 'Status'].map((h) => (
              <TableCell key={h} sx={tableHeaderSx}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <TableRow key={i}>
              {/* UID + folded hotkey (two lines) */}
              <TableCell
                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Stack spacing={0.25}>
                  <Skeleton
                    variant="text"
                    width={24}
                    height={14}
                    sx={{ borderRadius: 0 }}
                  />
                  <Skeleton
                    variant="text"
                    width={64}
                    height={10}
                    sx={{ borderRadius: 0 }}
                  />
                </Stack>
              </TableCell>
              <TableCell
                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Skeleton
                  variant="text"
                  width={56}
                  height={14}
                  sx={{ borderRadius: 0 }}
                />
              </TableCell>
              <TableCell
                align="right"
                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Skeleton
                  variant="text"
                  width={44}
                  height={14}
                  sx={{ ml: 'auto', borderRadius: 0 }}
                />
              </TableCell>
              {/* Status: dot + word */}
              <TableCell
                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Skeleton
                    variant="rectangular"
                    width={8}
                    height={8}
                    sx={{ borderRadius: 0 }}
                  />
                  <Skeleton
                    variant="text"
                    width={58}
                    height={12}
                    sx={{ borderRadius: 0 }}
                  />
                </Stack>
              </TableCell>
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
  <Stack sx={{ height: '100%' }}>
    <Stack spacing={1}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
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

export const ReservationsTrackerSkeleton: React.FC = () => (
  <Stack spacing={1.5} sx={{ height: '100%' }}>
    {/* Filter field (heading is provided by the tab) */}
    <Skeleton
      variant="rectangular"
      width="100%"
      height={36}
      sx={{ borderRadius: 0 }}
    />
    <Stack spacing={0.75}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Stack
          key={i}
          spacing={0.5}
          sx={{
            p: 1.25,
            borderRadius: 0,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Skeleton
              variant="text"
              width={220}
              height={14}
              sx={{ borderRadius: 0 }}
            />
            <Skeleton
              variant="text"
              width={60}
              height={12}
              sx={{ borderRadius: 0 }}
            />
          </Stack>
          <Skeleton
            variant="text"
            width={180}
            height={12}
            sx={{ borderRadius: 0 }}
          />
        </Stack>
      ))}
    </Stack>
  </Stack>
);

export const SwapTrackerSkeleton: React.FC = () => (
  <Stack sx={{ height: '100%' }}>
    {/* Search field (heading is provided by the tab) */}
    <Skeleton
      variant="rectangular"
      height={36}
      sx={{ mb: 1.5, borderRadius: 0 }}
    />
    <Stack spacing={0}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Stack
          key={i}
          spacing={0.75}
          sx={{
            px: 1,
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Skeleton
              variant="text"
              width={110}
              height={14}
              sx={{ borderRadius: 0 }}
            />
            <Skeleton
              variant="text"
              width={64}
              height={12}
              sx={{ borderRadius: 0 }}
            />
          </Stack>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={2}
            sx={{ borderRadius: 0 }}
          />
          <Skeleton
            variant="text"
            width={170}
            height={12}
            sx={{ borderRadius: 0 }}
          />
        </Stack>
      ))}
    </Stack>
  </Stack>
);
