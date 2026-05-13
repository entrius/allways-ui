import React, { useCallback } from 'react';
import { Box, Button, Stack, Typography, alpha, useTheme } from '@mui/material';
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  CrownIcon,
  CrownRateChart,
  MinerSwapHistory,
  Page,
  SEO,
  StickyNetworkHeader,
} from '../components';
import { useMinerStats, type MinerStats, type Range } from '../api';
import { FONTS } from '../theme';
import CopyableAddress from '../components/CopyableAddress';

const HOTKEY_SHORT = (h: string) => `${h.slice(0, 4)}…${h.slice(-4)}`;

const RANGES: Range[] = ['24h', '7d', '30d', '90d', 'all'];

const isRange = (v: string | null): v is Range =>
  ['24h', '7d', '30d', '90d', 'all'].includes(v ?? '');

const isRateRange = (v: string | null): v is '1h' | '4h' | '24h' | '7d' =>
  ['1h', '4h', '24h', '7d'].includes(v ?? '');

const HeaderField: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Stack spacing={0.4}>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.6rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'text.disabled',
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.85rem',
        color: 'text.primary',
      }}
    >
      {children}
    </Box>
  </Stack>
);

const fmtDuration = (sec: number | null): string => {
  if (sec == null || !Number.isFinite(sec)) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  const mins = Math.round(sec / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
};

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ label, value, sub }) => (
  <Box sx={{ px: 2, py: 1.75 }}>
    <Typography
      variant="monoSmall"
      sx={{
        fontSize: '0.58rem',
        letterSpacing: '0.22em',
        color: 'text.secondary',
        mb: 0.75,
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '1.25rem',
        fontWeight: 500,
        lineHeight: 1,
        color: 'text.primary',
      }}
    >
      {value}
    </Box>
    {sub && (
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          color: 'text.disabled',
          mt: 0.5,
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

const MinerStatsStrip: React.FC<{
  stats: MinerStats | undefined;
  range: Range;
  onRangeChange: (r: Range) => void;
}> = ({ stats, range, onRangeChange }) => {
  const volume = stats?.volumeTao
    ? parseFloat(stats.volumeTao).toFixed(2)
    : '—';
  const successPct =
    stats && stats.totalSwaps > 0
      ? `${(stats.successRate * 100).toFixed(0)}%`
      : '—';
  const crownPct =
    stats != null ? `${(stats.crownShare * 100).toFixed(0)}%` : '—';
  const swaps = stats != null ? stats.totalSwaps.toLocaleString() : '—';
  const completedSub = stats
    ? `${stats.completedSwaps} ok · ${stats.timedOutSwaps} out`
    : undefined;

  return (
    <Box
      sx={{
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          px: 2,
          pt: 1.5,
          pb: 0.5,
        }}
      >
        <Typography
          variant="monoSmall"
          sx={{
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            color: 'text.disabled',
          }}
        >
          Last
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {RANGES.map((r) => (
            <Button
              key={r}
              size="small"
              variant={r === range ? 'contained' : 'outlined'}
              onClick={() => onRangeChange(r)}
              sx={{
                minWidth: 0,
                px: 1.25,
                py: 0.4,
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                borderColor: 'divider',
              }}
            >
              {r}
            </Button>
          ))}
        </Stack>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          borderTop: '1px solid',
          borderColor: 'divider',
          '& > *': {
            borderRight: '1px solid',
            borderColor: 'divider',
          },
          '& > *:last-of-type': { borderRight: 'none' },
          '@media (max-width: 899px)': {
            '& > *:nth-of-type(3n)': { borderRight: 'none' },
            '& > *:nth-of-type(n + 4)': {
              borderTop: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <StatTile label="Swaps" value={swaps} sub={completedSub} />
        <StatTile label="Success" value={successPct} />
        <StatTile
          label="Volume"
          value={
            <>
              {volume}
              <Box component="span" sx={{ color: 'text.disabled', ml: 0.4 }}>
                τ
              </Box>
            </>
          }
        />
        <StatTile label="Crown share" value={crownPct} />
        <StatTile
          label="Avg fulfill"
          value={fmtDuration(stats?.avgFulfillSec ?? null)}
          sub={
            stats?.avgCompleteSec != null
              ? `complete ${fmtDuration(stats.avgCompleteSec)}`
              : undefined
          }
        />
      </Box>
    </Box>
  );
};

const MinerDetailPage: React.FC = () => {
  const { hotkey = '' } = useParams<{ hotkey: string }>();
  const [params, setParams] = useSearchParams();

  const range: Range = isRange(params.get('range'))
    ? (params.get('range') as Range)
    : '30d';
  const rateRange = isRateRange(params.get('rateRange'))
    ? (params.get('rateRange') as '1h' | '4h' | '24h' | '7d')
    : '4h';

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(params);
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const theme = useTheme();
  const { data: stats } = useMinerStats(hotkey, range);
  const uid = stats?.uid ?? null;
  const crownDirections = stats?.currentCrownDirections ?? [];

  return (
    <Page title={`Miner ${uid ?? ''}`}>
      <SEO
        title={`Miner ${uid ?? HOTKEY_SHORT(hotkey)}`}
        description={`Allways miner detail · uid ${uid ?? '?'} · ${HOTKEY_SHORT(hotkey)}`}
      />
      <StickyNetworkHeader />
      <Stack
        sx={{
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography
            component={RouterLink}
            to="/miners"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              color: 'text.secondary',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { color: 'primary.main' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 14 }} /> Miners
          </Typography>
        </Stack>

        <Box
          sx={{
            backgroundColor: 'surface.light',
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: '2px solid',
            borderLeftColor: 'primary.main',
            p: { xs: 2.5, md: 3 },
            mb: 3,
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography
                sx={{
                  fontFamily: FONTS.heading,
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  lineHeight: 1,
                }}
              >
                Miner uid{' '}
                <Box component="span" sx={{ color: 'primary.main' }}>
                  {uid ?? '?'}
                </Box>
              </Typography>
              {crownDirections.length > 0 && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  sx={{
                    px: 1,
                    py: 0.4,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.success.main, 0.4),
                    backgroundColor: alpha(theme.palette.success.main, 0.08),
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    color: 'success.main',
                    letterSpacing: '0.05em',
                  }}
                >
                  <CrownIcon size={12} color={theme.palette.success.main} />
                  {crownDirections.map((d) => d.replace('-', '→')).join('  ')}
                </Stack>
              )}
              {stats && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.4,
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    color: stats.isActive ? 'status.active' : 'text.disabled',
                    backgroundColor: stats.isActive
                      ? alpha(theme.palette.primary.main, 0.08)
                      : 'action.hover',
                    border: '1px solid',
                    borderColor: stats.isActive
                      ? alpha(theme.palette.primary.main, 0.35)
                      : 'divider',
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: stats.isActive
                        ? 'status.active'
                        : 'text.disabled',
                    }}
                  />
                  {stats.isActive ? 'active' : 'inactive'}
                </Box>
              )}
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, auto)',
                },
                gap: { xs: 1.5, md: 4 },
              }}
            >
              <HeaderField label="hotkey">
                <CopyableAddress address={hotkey} />
              </HeaderField>
              {stats?.collateralRao && (
                <HeaderField label="collateral">
                  {(Number(stats.collateralRao) / 1e9).toFixed(2)}
                  <Box
                    component="span"
                    sx={{ color: 'text.disabled', ml: 0.4 }}
                  >
                    τ
                  </Box>
                </HeaderField>
              )}
              {stats?.activatedAt != null && (
                <HeaderField label="activated at block">
                  {stats.activatedAt.toLocaleString()}
                </HeaderField>
              )}
            </Box>
          </Stack>
        </Box>

        <MinerStatsStrip
          stats={stats}
          range={range}
          onRangeChange={(r) => setParam('range', r)}
        />

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <CrownRateChart
              range={rateRange}
              onRangeChange={(r) => setParam('rateRange', r)}
              minerHotkey={hotkey}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MinerSwapHistory hotkey={hotkey} />
          </Box>
        </Stack>
      </Stack>
    </Page>
  );
};

export default MinerDetailPage;
