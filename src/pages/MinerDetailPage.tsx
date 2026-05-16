import React, { useCallback } from 'react';
import { Box, Button, Stack, Typography, alpha, useTheme } from '@mui/material';
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  CrownHistoryPanel,
  CrownIcon,
  CrownRateChart,
  MinerSwapHistory,
  Page,
  SEO,
  StickyNetworkHeader,
} from '../components';
import {
  useMinerStats,
  useMiners,
  type Direction,
  type MinerStats,
  type Range,
} from '../api';
import { FONTS } from '../theme';
import { formatTao, shortHotkey } from '../utils/format';
import CopyableAddress from '../components/CopyableAddress';

const RANGES: Range[] = ['24h', '7d', '30d', '90d', 'all'];

const isRange = (v: string | null): v is Range =>
  ['24h', '7d', '30d', '90d', 'all'].includes(v ?? '');

const isRateRange = (v: string | null): v is '1h' | '4h' | '24h' | '7d' =>
  ['1h', '4h', '24h', '7d'].includes(v ?? '');

const isDirection = (v: string | null): v is Direction =>
  v === 'BTC-TAO' || v === 'TAO-BTC';

const isCrownRange = (v: string | null): v is '1h' | '2h' | '4h' =>
  v === '1h' || v === '2h' || v === '4h';

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

const PerformanceMetric: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ label, value, sub }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      sx={{
        fontFamily: FONTS.heading,
        fontSize: '2rem',
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: 'text.primary',
      }}
    >
      {value}
    </Typography>
    <Typography
      variant="monoSmall"
      sx={{
        mt: 1,
        fontSize: '0.58rem',
        letterSpacing: '0.22em',
        color: 'text.disabled',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    {sub && (
      <Typography
        sx={{
          mt: 0.5,
          fontFamily: FONTS.body,
          fontSize: '0.7rem',
          color: 'text.secondary',
          minHeight: '1.1em',
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

const RangeChips: React.FC<{
  range: Range;
  onRangeChange: (r: Range) => void;
}> = ({ range, onRangeChange }) => (
  <Stack direction="row" spacing={0.5}>
    {RANGES.map((r) => (
      <Button
        key={r}
        size="small"
        variant="text"
        onClick={() => onRangeChange(r)}
        sx={{
          minWidth: 0,
          px: 1.25,
          py: 0.3,
          fontFamily: FONTS.mono,
          fontSize: '0.62rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: r === range ? 'primary.main' : 'text.disabled',
          fontWeight: r === range ? 600 : 400,
          '&:hover': { backgroundColor: 'transparent', color: 'text.primary' },
        }}
      >
        {r}
      </Button>
    ))}
  </Stack>
);

const PerformanceGrid: React.FC<{ stats: MinerStats | undefined }> = ({
  stats,
}) => {
  const volume = stats?.volumeTao
    ? parseFloat(stats.volumeTao).toFixed(2)
    : '—';
  const successPct =
    stats && stats.totalSwaps > 0
      ? `${(stats.successRate * 100).toFixed(0)}%`
      : '—';
  const swaps = stats != null ? stats.totalSwaps.toLocaleString() : '—';
  const completedSub = stats
    ? `${stats.completedSwaps} ok · ${stats.timedOutSwaps} failed`
    : undefined;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        },
        rowGap: 3,
        columnGap: { xs: 2, md: 4 },
      }}
    >
      <PerformanceMetric label="Swaps" value={swaps} sub={completedSub} />
      <PerformanceMetric label="Success" value={successPct} />
      <PerformanceMetric
        label="Volume"
        value={
          <>
            {volume}
            <Box
              component="span"
              sx={{ color: 'text.disabled', ml: 0.5, fontSize: '1.4rem' }}
            >
              τ
            </Box>
          </>
        }
      />
      <PerformanceMetric
        label="Avg fulfill"
        value={fmtDuration(stats?.avgFulfillSec ?? null)}
      />
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
  const crownDirection: Direction = isDirection(params.get('crownDir'))
    ? (params.get('crownDir') as Direction)
    : 'BTC-TAO';
  const crownGridRange: '1h' | '2h' | '4h' = isCrownRange(
    params.get('crownGridRange'),
  )
    ? (params.get('crownGridRange') as '1h' | '2h' | '4h')
    : '2h';
  const crownGridPan = parseInt(params.get('crownPan') ?? '600', 10) || 0;
  const parseBlockParam = (v: string | null): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };
  const crownFrom = parseBlockParam(params.get('crownFrom'));
  const crownTo = parseBlockParam(params.get('crownTo'));

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );
  const setParam = (key: string, value: string | undefined) =>
    updateParams({ [key]: value });

  const theme = useTheme();
  const { data: stats } = useMinerStats(hotkey, range);
  const { data: miners } = useMiners();
  const liveMiner = miners?.find((m) => m.hotkey === hotkey) ?? null;
  const uid = stats?.uid ?? null;
  const crownDirections = stats?.currentCrownDirections ?? [];
  // The on-chain commitment is canonicalized so TAO is always destChain (see
  // Miners.ts). `rate` is source→dest (BTC→TAO when sourceChain='btc'),
  // `counterRate` is dest→source (TAO→BTC).
  const fwdRate = parseFloat(liveMiner?.rate ?? '0');
  const revRate = parseFloat(liveMiner?.counterRate ?? '0');
  const fwdLabel =
    liveMiner?.sourceChain && liveMiner?.destChain
      ? `${liveMiner.sourceChain.toUpperCase()} → ${liveMiner.destChain.toUpperCase()}`
      : null;
  const revLabel =
    liveMiner?.sourceChain && liveMiner?.destChain
      ? `${liveMiner.destChain.toUpperCase()} → ${liveMiner.sourceChain.toUpperCase()}`
      : null;

  return (
    <Page title={`Miner ${uid ?? ''}`}>
      <SEO
        title={`Miner ${uid ?? shortHotkey(hotkey)}`}
        description={`Allways miner detail · uid ${uid ?? '?'} · ${shortHotkey(hotkey)}`}
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
                  {formatTao(stats.collateralRao)}
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
              {fwdRate > 0 && fwdLabel && (
                <HeaderField label={`quote · ${fwdLabel}`}>
                  {fwdRate.toFixed(2)}
                  <Box
                    component="span"
                    sx={{ color: 'text.disabled', ml: 0.4 }}
                  >
                    τ
                  </Box>
                </HeaderField>
              )}
              {revRate > 0 && revLabel && (
                <HeaderField label={`quote · ${revLabel}`}>
                  {revRate.toFixed(2)}
                  <Box
                    component="span"
                    sx={{ color: 'text.disabled', ml: 0.4 }}
                  >
                    τ
                  </Box>
                </HeaderField>
              )}
            </Box>

            <Box
              sx={{
                pt: 2.5,
                mt: 0.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack
                direction="row"
                alignItems="baseline"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography
                  variant="monoSmall"
                  sx={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.22em',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  Performance · last {range}
                </Typography>
                <RangeChips
                  range={range}
                  onRangeChange={(r) => setParam('range', r)}
                />
              </Stack>
              <PerformanceGrid stats={stats} />
            </Box>
          </Stack>
        </Box>

        {uid != null && (
          <CrownHistoryPanel
            hotkey={hotkey}
            lockedUid={uid}
            direction={crownDirection}
            onDirectionChange={(d) => setParam('crownDir', d)}
            range={crownGridRange}
            onRangeChange={(r) => setParam('crownGridRange', r)}
            pan={crownGridPan}
            onPanChange={(p) =>
              setParam('crownPan', p === 0 ? undefined : String(p))
            }
            customFrom={crownFrom}
            customTo={crownTo}
            onCustomRangeChange={(from, to) =>
              updateParams({
                crownFrom: from == null ? undefined : String(from),
                crownTo: to == null ? undefined : String(to),
              })
            }
          />
        )}

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
