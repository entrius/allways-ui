import React from 'react';
import {
  Box,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useUsdPrices, type MinerStats, type Range } from '../../api';
import type { Miner } from '../../api/models/Miners';
import { FONTS } from '../../theme';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  directionalRate,
  formatRate,
  formatUnits,
  formatUnixTime,
  formatUsd,
  rateUnit,
  usdFromBackingMap,
} from '../../utils/format';
import {
  allDirections,
  chainList,
  hubChains,
  hubLeg,
} from '../../api/models/chains';
import CopyableAddress from '../CopyableAddress';
import { lanesFor } from '../../api/models/MinersDashboard';
import CrownIcon from './CrownIcon';
import EligibilityChip from './EligibilityChip';
import { useMinerEligibility } from './eligibility';
import RangeChips from '../RangeChips';

// 30d is the deepest window; the API clamps everything to ~30d
// (MAX_LOOKBACK_BLOCKS) so crown_holders stays prunable, which made the old
// 90d/all chips return identical data to 30d.
const RANGES: Range[] = ['1h', '24h', '7d', '30d'];

// "SOL-BTC" → "SOL→BTC" in display symbols (arbusdc renders as USDC), the
// card-local compact form of directionLabel.
const compactDirection = (dir: string): string =>
  dir
    .split('-')
    .map((leg) => chainSymbol(leg.toLowerCase()))
    .join('→');

const eyebrowSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.6rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'text.disabled',
} as const;

const HeaderField: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Stack spacing={0.4}>
    <Typography sx={eyebrowSx}>{label}</Typography>
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

const PerformanceGrid: React.FC<{ stats: MinerStats | undefined }> = ({
  stats,
}) => {
  const prices = useUsdPrices();
  // Volume as estimated USD (canonical per-backing figures in the tooltip);
  // per-backing "X SOL + Y TAO" — never summed — without prices.
  const volumeUsd = stats
    ? usdFromBackingMap(stats.volumeByBacking, prices, stats.volumeSol)
    : null;
  const volumeEntries = stats
    ? backingEntries(stats.volumeByBacking, stats.volumeSol)
    : null;
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
        label={volumeUsd != null ? 'Volume (est. USD)' : 'Volume'}
        value={
          volumeUsd != null ? (
            <span
              title={
                stats
                  ? backingTooltip(stats.volumeByBacking, stats.volumeSol)
                  : undefined
              }
            >
              {formatUsd(volumeUsd)}
            </span>
          ) : volumeEntries ? (
            volumeEntries.map((e, i) => (
              <React.Fragment key={e.chain}>
                {i > 0 && (
                  <Box component="span" sx={{ color: 'text.disabled' }}>
                    {' + '}
                  </Box>
                )}
                {e.amount}
                <Box
                  component="span"
                  sx={{ color: 'text.disabled', ml: 0.5, fontSize: '1.4rem' }}
                >
                  {chainSymbol(e.chain)}
                </Box>
              </React.Fragment>
            ))
          ) : (
            '—'
          )
        }
      />
      <PerformanceMetric
        label="Avg fulfill"
        value={fmtDuration(stats?.avgFulfillSec ?? null)}
      />
    </Box>
  );
};

interface QuoteRow {
  key: string;
  src: string;
  dst: string;
  backing: string;
  fwd: number | null;
  rev: number | null;
}

// One directional quote cell: rate + unit, a gold crown when the miner is
// the current crown holder on that leg.
const QuoteCell: React.FC<{
  from: string;
  to: string;
  rate: number | null;
  crown: boolean;
}> = ({ from, to, rate, crown }) =>
  rate == null ? (
    <Box component="span" sx={{ color: 'text.disabled' }}>
      —
    </Box>
  ) : (
    <Box
      component="span"
      sx={{
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      {crown && (
        <Tooltip
          title={`current crown · ${chainSymbol(from)}→${chainSymbol(to)}`}
          placement="top"
        >
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <CrownIcon size={11} />
          </Box>
        </Tooltip>
      )}
      {formatRate(rate)}
      <Box
        component="span"
        sx={{ color: 'text.disabled', ml: 0.5, fontSize: '0.68rem' }}
      >
        {rateUnit(from, to)}
      </Box>
    </Box>
  );

// Top card on the per-miner page: identity (uid + crown badge + active dot),
// meta strip (hotkey, collateral, activation), a dense per-pair quote table
// with inline crown marks, the chain address list, and the performance grid
// scoped to the selected range.
const MinerDetailHeader: React.FC<{
  hotkey: string;
  uid: number | null;
  stats: MinerStats | undefined;
  pairs: Miner[];
  range: Range;
  onRangeChange: (r: Range) => void;
}> = ({ hotkey, uid, stats, pairs, range, onRangeChange }) => {
  const theme = useTheme();
  const eligibility = useMinerEligibility(hotkey);
  const crownDirections = stats?.currentCrownDirections ?? [];
  // Per-lane crown keys ("SOL-TAO:tao"). sol↔tao has two lanes per direction,
  // so the quote table must match on backing too, else a tao-lane crown would
  // also gild the sol-bond row. Older das lacks currentCrownLanes: treat every
  // lane of a crowned direction as held (the pre-lane behaviour).
  const crownLaneKey = (dir: string, backing: string) =>
    `${dir.toUpperCase()}:${backing.toLowerCase()}`;
  const crownSet = new Set(
    stats?.currentCrownLanes
      ? stats.currentCrownLanes.map((l) => crownLaneKey(l.direction, l.backing))
      : crownDirections.flatMap((d) =>
          lanesFor(d).map((b) => crownLaneKey(d, b)),
        ),
  );
  const crownGold = theme.palette.asset.btc;
  // Per-miner columns agree across a miner's pair rows; the first is
  // representative for identity fields.
  const liveMiner = pairs[0] ?? null;
  // On-chain commitment is canonicalized so the hub is pinned as source; both
  // stored rates are canonical "spoke per 1 hub". Each pair renders as ONE row
  // with both legs shown DIRECTIONALLY — "to per 1 from" of that leg (the
  // reverse inverts); the unit label carries the leg's direction.
  const dirOrder = allDirections();
  const orderIdx = (src: string, dst: string): number => {
    const i = dirOrder.indexOf(`${src}-${dst}`.toUpperCase());
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const quoteRows: QuoteRow[] = pairs
    .flatMap((p) => {
      const src = p.sourceChain?.toLowerCase();
      const dst = p.destChain?.toLowerCase();
      if (!src || !dst) return [];
      const fwd = directionalRate(src, dst, p.rate);
      const rev = directionalRate(dst, src, p.counterRate);
      return {
        key: `${src}-${dst}-${p.backing ?? ''}`,
        src,
        dst,
        backing: (p.backing ?? 'sol').toLowerCase(),
        fwd: fwd != null && fwd > 0 ? fwd : null,
        rev: rev != null && rev > 0 ? rev : null,
      };
    })
    .filter((r) => r.fwd != null || r.rev != null)
    .sort((a, b) => {
      const d = orderIdx(a.src, a.dst) - orderIdx(b.src, b.dst);
      if (d !== 0) return d;
      // Same pair twice = dual-backing twins; sol bond first.
      return a.backing === b.backing ? 0 : a.backing === 'sol' ? -1 : 1;
    });

  // One bond purse per backing, each in ITS OWN asset — a tao purse is rao,
  // never piped through the SOL formatter. Same-backing rows share a purse,
  // so keep the max; stats.collateral stands in when no live rows exist.
  const purseMap = new Map<string, string>();
  for (const p of pairs) {
    const b = (p.backing ?? 'sol').toLowerCase();
    const prev = purseMap.get(b);
    if (prev == null || Number(p.collateral) > Number(prev))
      purseMap.set(b, p.collateral);
  }
  if (purseMap.size === 0 && stats?.collateral)
    purseMap.set('sol', stats.collateral);
  const hubOrder = hubChains();
  const purses = [...purseMap.entries()].sort(
    (a, b) => hubOrder.indexOf(a[0]) - hubOrder.indexOf(b[0]),
  );

  const addresses = new Map<string, string>();
  for (const p of pairs) {
    if (p.sourceChain && p.sourceAddress)
      addresses.set(p.sourceChain.toLowerCase(), p.sourceAddress);
    if (p.destChain && p.destAddress)
      addresses.set(p.destChain.toLowerCase(), p.destAddress);
  }
  // The solana pubkey IS the miner's sol-side address; folding it in here
  // (instead of a separate identity field) keeps it rendered exactly once.
  if (!addresses.has('sol') && liveMiner?.solanaPubkey)
    addresses.set('sol', liveMiner.solanaPubkey);
  const chainOrder = chainList().map((c) => c.id);
  const addressRows = [...addresses].sort((a, b) => {
    const ai = chainOrder.indexOf(a[0]);
    const bi = chainOrder.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const tableCellSx = {
    py: 0.7,
    borderBottom: '1px solid',
    borderColor: 'divider',
    fontFamily: FONTS.mono,
    fontSize: '0.8rem',
    color: 'text.primary',
    minWidth: 0,
    whiteSpace: 'nowrap',
  } as const;
  const tableHeadSx = { ...eyebrowSx, ...tableCellSx, fontSize: '0.6rem' };

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '2px solid',
        borderLeftColor: 'primary.main',
        p: { xs: 2.5, md: 3 },
        mb: 3,
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
        >
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
          {/* Emission-gate verdict beside the quote-side status: active means
              "quoting", eligible means "the validator pays it" — independent
              axes a struck-but-active miner splits. */}
          {eligibility.state !== 'none' && (
            <EligibilityChip
              state={eligibility.state}
              live={eligibility.live}
              asOf={eligibility.asOf}
            />
          )}
          {crownDirections.length > 0 && (
            <Tooltip
              title={`current crown holder · ${crownDirections
                .map(compactDirection)
                .join(' · ')}`}
              placement="top"
            >
              {/* inline-flex + gap, not Stack spacing — Stack margins skip
                  bare text children, jamming the icon against the label. */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.4,
                  border: '1px solid',
                  borderColor: alpha(crownGold, 0.45),
                  backgroundColor: alpha(crownGold, 0.08),
                  fontFamily: FONTS.mono,
                  fontSize: '0.7rem',
                  color: crownGold,
                  letterSpacing: '0.05em',
                }}
              >
                <CrownIcon size={12} color={crownGold} sx={{ mr: 0 }} />
                {/* A couple of crowns read best as directions; more collapse
                    to a count (each leg is also crowned in the quote table). */}
                {crownDirections.length <= 2
                  ? crownDirections.map(compactDirection).join('  ')
                  : `${crownDirections.length} crowns`}
              </Box>
            </Tooltip>
          )}
        </Stack>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: { xs: 3, md: 6 },
            rowGap: 1.5,
          }}
        >
          <HeaderField label="hotkey">
            <CopyableAddress address={hotkey} />
          </HeaderField>
          {purses.length > 0 && (
            <HeaderField label="collateral">
              {purses.map(([backing, amount], i) => (
                <React.Fragment key={backing}>
                  {i > 0 && (
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      {' + '}
                    </Box>
                  )}
                  {formatUnits(amount, backing)}
                  <Box
                    component="span"
                    sx={{ color: 'text.disabled', ml: 0.4 }}
                  >
                    {chainSymbol(backing)}
                  </Box>
                </React.Fragment>
              ))}
            </HeaderField>
          )}
          {stats?.activatedAt != null && (
            <HeaderField label="activated">
              {formatUnixTime(stats.activatedAt)}
            </HeaderField>
          )}
        </Box>

        {(quoteRows.length > 0 || addressRows.length > 0) && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md:
                  quoteRows.length > 0 && addressRows.length > 0
                    ? 'minmax(0, 1.7fr) minmax(0, 1fr)'
                    : '1fr',
              },
              columnGap: { md: 6 },
              rowGap: 2.5,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            {quoteRows.length > 0 && (
              <Box sx={{ minWidth: 0, overflowX: 'auto' }}>
                <Box
                  sx={{
                    display: 'grid',
                    // max-content floors: tracks never shrink below the
                    // nowrap rate text (the wrapper scrolls on xs instead
                    // of cells overlapping).
                    gridTemplateColumns:
                      'max-content minmax(max-content, 1fr) minmax(max-content, 1fr)',
                    columnGap: { xs: 2, md: 3 },
                    alignItems: 'center',
                    // Last row of cells drops its rule so the table doesn't
                    // double-border against the section divider below.
                    '& > *:nth-last-of-type(-n+3)': { borderBottom: 0 },
                  }}
                >
                  <Box sx={tableHeadSx}>quotes</Box>
                  <Box sx={tableHeadSx} title="left → right leg">
                    rate →
                  </Box>
                  <Box sx={tableHeadSx} title="right → left leg">
                    rate ←
                  </Box>
                  {quoteRows.map((r) => (
                    <React.Fragment key={r.key}>
                      <Box
                        sx={{
                          ...tableCellSx,
                          fontSize: '0.72rem',
                          color: 'text.secondary',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {chainSymbol(r.src)}/{chainSymbol(r.dst)}
                        {/* Tag only a NON-native bond (backing ≠ the pair's
                            hub leg) — the marker for dual-backing twins. */}
                        {r.backing !== hubLeg(r.src, r.dst) && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.75,
                              px: 0.5,
                              fontSize: '0.58rem',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              border: '1px solid',
                              borderColor: 'divider',
                              color: 'text.disabled',
                            }}
                          >
                            {chainSymbol(r.backing)} bond
                          </Box>
                        )}
                      </Box>
                      <Box sx={tableCellSx}>
                        <QuoteCell
                          from={r.src}
                          to={r.dst}
                          rate={r.fwd}
                          crown={crownSet.has(
                            crownLaneKey(`${r.src}-${r.dst}`, r.backing),
                          )}
                        />
                      </Box>
                      <Box sx={tableCellSx}>
                        <QuoteCell
                          from={r.dst}
                          to={r.src}
                          rate={r.rev}
                          crown={crownSet.has(
                            crownLaneKey(`${r.dst}-${r.src}`, r.backing),
                          )}
                        />
                      </Box>
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            )}
            {addressRows.length > 0 && (
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'max-content minmax(0, 1fr)',
                    columnGap: { xs: 2, md: 3 },
                    alignItems: 'center',
                    '& > *:nth-last-of-type(-n+2)': { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ ...tableHeadSx, gridColumn: '1 / -1' }}>
                    addresses
                  </Box>
                  {addressRows.map(([chain, address]) => (
                    <React.Fragment key={chain}>
                      <Box
                        sx={{
                          ...tableCellSx,
                          fontSize: '0.72rem',
                          color: 'text.secondary',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {chainSymbol(chain)}
                      </Box>
                      <Box sx={tableCellSx}>
                        <CopyableAddress
                          address={address}
                          fontSize="0.8rem"
                          color="text.primary"
                        />
                      </Box>
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

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
              value={range}
              options={RANGES}
              onChange={onRangeChange}
            />
          </Stack>
          <PerformanceGrid stats={stats} />
        </Box>
      </Stack>
    </Box>
  );
};

export default MinerDetailHeader;
