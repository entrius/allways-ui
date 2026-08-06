import React, { useState, useCallback, useRef } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  type Theme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  useAllSwaps,
  useCompleteSwapHistory,
  useMinerLabel,
  useReservations,
  useSwapDetail,
  useSwapsCount,
} from '../../api';
import {
  displayEventType,
  type ActiveSwap,
  type Reservation,
} from '../../api/models';
import CopyableAddress from '../CopyableAddress';
import { FONTS } from '../../theme';
import { SwapTrackerSkeleton } from './Skeletons';
import {
  formatAmount,
  formatDurationSecs,
  formatTimeAgo,
  lamportsToSol,
  swapDisplayId,
} from '../../utils/format';
import { hubChain } from '../../api/models/chains';
import {
  applyTxFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  isTerminal,
  solNotional,
  toNum,
  type StatusFilter,
  type TxFilters,
} from './txFilters';

const PAGE_SIZE = 25;

// One shared column template so the header row and every card line up as a
// table: # | from | to | miner | age | settle | status. The three middle
// stat columns collapse on phones.
const GRID_COLS = {
  xs: '40px minmax(0, 1fr) minmax(0, 1fr) 84px',
  sm: '48px minmax(0, 1fr) minmax(0, 1fr) 88px 104px 64px 100px',
};
const HIDE_XS = { display: { xs: 'none', sm: 'block' } };

const headCellSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.56rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

// The muted mono treatment shared by the table's stat cells.
const statCellSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.65rem',
  color: 'text.secondary',
  whiteSpace: 'nowrap',
};

const getStatusColor = (
  status: string,
  palette: {
    text: { primary: string; secondary: string };
  },
): string => {
  // Mostly monochrome, but terminal outcomes keep semantic color — completed
  // green / timed-out red. In-flight states stay neutral.
  const map: Record<string, string> = {
    ACTIVE: palette.text.secondary,
    FULFILLED: palette.text.secondary,
    COMPLETED: 'var(--color-success)',
    TIMED_OUT: 'var(--color-danger)',
  };
  return map[status] ?? palette.text.secondary;
};

// Click-to-sort columns. Anything but the default (# descending, i.e.
// newest) walks the complete history: the server pages newest-first, so
// ranking a single page would only ever sort the most recent 50 rows.
// Input/Output both rank by the SOL-leg notional — amounts in mixed chain
// units aren't comparable, the hub leg is.
type SortCol =
  | 'num'
  | 'input'
  | 'output'
  | 'miner'
  | 'age'
  | 'settle'
  | 'status';
type SortDir = 'asc' | 'desc';
const DEFAULT_DIR: Record<SortCol, SortDir> = {
  num: 'desc',
  input: 'desc',
  output: 'desc',
  miner: 'asc',
  age: 'desc',
  settle: 'desc',
  status: 'asc',
};

// Settle duration; in-flight swaps rank on elapsed-so-far.
const settleSecs = (s: ActiveSwap, nowSec: number): number => {
  const start = toNum(s.initiatedAt);
  if (!start) return 0;
  const end = toNum(s.resolvedAt ?? s.completedAt) || nowSec;
  return Math.max(0, end - start);
};

// Compact wall-clock stamp for a table cell: "Jul 24 09:15". Event
// timestamps carry seconds — lifecycle steps are often seconds apart.
const exactTime = (unix: string | null, withSecs?: boolean): string => {
  const t = toNum(unix);
  if (!t) return '—';
  const d = new Date(t * 1000);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
      ...(withSecs && { second: '2-digit' }),
    },
  )}`;
};

// Live elapsed readout for in-flight rows: "0:34", "12:07", "1:02:07".
const formatClock = (secs: number): string => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`;
};

// Compact mono field treatment for the filter panel's inputs/selects. An
// ACTIVE (non-default) field carries a solid primary border so it's obvious
// at a glance which filters are narrowing the list.
const filterFieldSx = (theme: Theme, active?: boolean) => ({
  '& .MuiOutlinedInput-root': {
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    color: 'text.primary',
    borderRadius: 0,
    height: 28,
    backgroundColor: 'background.default',
    '& fieldset': {
      borderColor: active ? theme.palette.text.primary : theme.palette.divider,
      ...(active && { borderWidth: 2 }),
    },
    '&:hover fieldset': {
      borderColor: active
        ? theme.palette.text.primary
        : theme.palette.border.light,
    },
    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
  },
  '& .MuiOutlinedInput-input': { py: 0 },
});

// A clickable column header: click sorts, clicking again flips direction;
// the active column carries the arrow.
const SortHeader: React.FC<{
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  hideXs?: boolean;
  alignRight?: boolean;
}> = ({ label, active, dir, onClick, hideXs, alignRight }) => (
  <Box
    component="button"
    onClick={onClick}
    sx={{
      all: 'unset',
      cursor: 'pointer',
      ...headCellSx,
      color: active ? 'text.primary' : 'text.secondary',
      whiteSpace: 'nowrap',
      '&:hover': { color: 'text.primary' },
      ...(hideXs && { display: { xs: 'none', sm: 'block' } }),
      ...(alignRight && { textAlign: 'right' }),
    }}
  >
    {label}
    {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
  </Box>
);

// A filter-panel input with its small uppercase mono caption; the caption
// goes bold-primary while its filter is active.
const FilterField: React.FC<{
  label: string;
  active?: boolean;
  children: React.ReactNode;
}> = ({ label, active, children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.56rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: active ? 'text.primary' : 'text.secondary',
        fontWeight: active ? 700 : 400,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

// Live lifecycle readout for an in-flight row's status cell: the swap's
// latest event, straight from the detail endpoint (SSE keeps it fresh).
const LatestEventCell: React.FC<{ swapId: string }> = ({ swapId }) => {
  const { data } = useSwapDetail(swapId);
  const latest = React.useMemo(() => {
    const events = data?.events ?? [];
    return events.length
      ? [...events].sort(
          (a, b) =>
            toNum(b.blockTime) - toNum(a.blockTime) ||
            (b.logIndex ?? 0) - (a.logIndex ?? 0),
        )[0]
      : null;
  }, [data]);
  if (!latest) return null;
  return (
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.56rem',
        color: 'text.secondary',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {displayEventType(latest)}
    </Typography>
  );
};

// Time + Settle cells for an in-flight row, ticking on the shared 1s clock.
// Anchors on the best REAL timestamp so a page refresh never restarts the
// counter: on-chain initiated time, else the reservation's reserved-at, else
// the SwapClaimed event's block time (from the same swap-detail query the
// status cell already runs — react-query dedupes the fetch).
const LiveTimeSettle: React.FC<{
  swap: ActiveSwap;
  reservedAt: string | null | undefined;
  nowSec: number;
}> = ({ swap, reservedAt, nowSec }) => {
  const known = toNum(swap.initiatedAt) || toNum(reservedAt ?? null);
  const { data } = useSwapDetail(known ? '' : swap.swapId);
  const claimedAt = React.useMemo(() => {
    const times = (data?.events ?? [])
      .map((e) => toNum(e.blockTime))
      .filter((t) => t > 0);
    return times.length ? Math.min(...times) : 0;
  }, [data]);
  const anchor = known || claimedAt;
  return (
    <>
      <Box sx={HIDE_XS}>
        <Typography sx={statCellSx}>
          {anchor ? exactTime(String(anchor)) : '—'}
        </Typography>
        <Typography
          sx={{ ...statCellSx, fontSize: '0.56rem', color: 'text.disabled' }}
        >
          {anchor ? formatTimeAgo(anchor, nowSec * 1000) : '—'}
        </Typography>
      </Box>
      <Typography sx={{ ...statCellSx, ...HIDE_XS }}>
        {anchor ? formatClock(nowSec - anchor) : '—'}
      </Typography>
    </>
  );
};

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const SwapTracker: React.FC<{
  embedded?: boolean;
}> = ({ embedded }) => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  // The URL query string is the source of truth for filters and sort, so
  // any filtered/sorted view is shareable and the pulse chart reads the
  // exact same state. Defaults are omitted from the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = React.useMemo(
    () => filtersFromParams(searchParams),
    [searchParams],
  );
  const setFilters = (next: TxFilters) =>
    setSearchParams(filtersToParams(next, searchParams), { replace: true });
  const setFilter = <K extends keyof TxFilters>(key: K, value: TxFilters[K]) =>
    setFilters({ ...filters, [key]: value });

  const sortParam = searchParams.get('sort') as SortCol | null;
  const sortCol: SortCol =
    sortParam && sortParam in DEFAULT_DIR ? sortParam : 'num';
  const sortDir: SortDir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  // Click the active column to flip direction; a new column starts at its
  // natural direction.
  const handleSort = (col: SortCol) => {
    const nextDir: SortDir =
      col === sortCol ? (sortDir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIR[col];
    const p = new URLSearchParams(searchParams);
    if (col === 'num' && nextDir === 'desc') {
      p.delete('sort');
      p.delete('dir');
    } else {
      p.set('sort', col);
      if (nextDir === 'asc') p.set('dir', 'asc');
      else p.delete('dir');
    }
    setSearchParams(p, { replace: true });
  };
  const isDefaultSort = sortCol === 'num' && sortDir === 'desc';
  const debouncedSearch = useDebounce(search, 300);

  const activeFilters = countActiveFilters(filters);

  // A 1s clock that drives the live counters (Settle elapsed, "Xs ago") on
  // in-flight rows. Only ticks while something is actually in flight, and
  // skips hidden tabs.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // "#N" (or a bare short number) is a transaction-number lookup; a huge
  // digit string (> 9 digits) can only be a legacy int64 swap id.
  const idMatch = debouncedSearch.trim().match(/^#?(\d+)$/);
  const numericSearch = idMatch?.[1] ?? '';
  const exactSeq = numericSearch.length <= 9 ? numericSearch : '';
  const exactSwapId = numericSearch.length > 9 ? numericSearch : '';

  const { data: detail, isLoading: detailLoading } = useSwapDetail(exactSwapId);
  const { data: fuzzy, isLoading: fuzzyLoading } = useAllSwaps(
    exactSeq
      ? { seq: Number(exactSeq) }
      : { search: debouncedSearch || undefined, limit },
    !exactSwapId,
  );
  const { data: swapsCount } = useSwapsCount();
  const minerLabel = useMinerLabel();

  // A pending/claimed swap's row is nearly empty until validator quorum, but
  // its LIVE reservation already carries the pair, amounts, miner, and the
  // proven from-wallet. Fetch the (small) active-reservation set and borrow
  // whatever an in-flight row is missing. SSE keeps this fresh.
  const { data: reservations } = useReservations();
  const reservationBySwapId = React.useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const r of reservations ?? []) {
      if (r.swapId != null) map.set(r.swapId, r);
    }
    return map;
  }, [reservations]);
  // SwapClaimed-stage rows aren't linked yet (swap_id is stamped on the
  // reservation later), but the request hash embeds the user's protocol
  // address prefix ("<hash8>-<user8>"). One candidate → use it outright.
  // Several → never guess; show only the fields ALL candidates agree on
  // (same pair, same from-wallet — provable regardless of which one it is).
  const reservationByUserPrefix = React.useMemo(() => {
    const byPrefix = new Map<string, Reservation[]>();
    for (const r of reservations ?? []) {
      if (r.swapId != null) continue;
      const prefix = r.requestHash?.split('-')[1];
      if (!prefix) continue;
      byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), r]);
    }
    const agreed = <K extends keyof Reservation>(
      rs: Reservation[],
      key: K,
    ): Reservation[K] | null =>
      rs.every((r) => r[key] === rs[0][key]) ? rs[0][key] : null;
    const map = new Map<string, Partial<Reservation>>();
    for (const [prefix, rs] of byPrefix) {
      map.set(
        prefix,
        rs.length === 1
          ? rs[0]
          : {
              fromChain: agreed(rs, 'fromChain'),
              toChain: agreed(rs, 'toChain'),
              fromAmount: agreed(rs, 'fromAmount'),
              toAmount: agreed(rs, 'toAmount'),
              minerHotkey: agreed(rs, 'minerHotkey') ?? undefined,
              userFromAddress: agreed(rs, 'userFromAddress') ?? undefined,
              reservedAt: agreed(rs, 'reservedAt') ?? undefined,
            },
      );
    }
    return map;
  }, [reservations]);

  // Filtering and non-date sorting are client-side (the /swaps endpoint has
  // neither a chain filter nor a sort param). A single request caps at 50
  // rows, which would hide older matches — or rank only the newest page — so
  // in either mode (and with no search narrowing things server-side) walk the
  // complete history instead.
  const usingComplete =
    (!isDefaultSort || activeFilters > 0) && !exactSwapId && !debouncedSearch;
  const { data: completeHistory, isLoading: completeLoading } =
    useCompleteSwapHistory(usingComplete);

  // While the complete walk is still in flight, keep showing the paged rows
  // instead of blanking to a skeleton — filters/sorts upgrade to the full
  // history the moment it lands.
  const fetched = React.useMemo(
    () =>
      exactSwapId
        ? detail?.swap
          ? [detail.swap]
          : []
        : usingComplete
          ? (completeHistory ?? fuzzy)
          : fuzzy,
    [exactSwapId, detail, usingComplete, completeHistory, fuzzy],
  );
  const isLoading = exactSwapId
    ? detailLoading
    : usingComplete
      ? completeLoading && !fuzzy
      : fuzzyLoading;

  // Filter, then rank, whatever list is in play. Under an active search only
  // the fetched matches are considered (search stays server-side); otherwise
  // filters and non-date sorts run over the complete history, so results are
  // network-wide.
  const swaps = React.useMemo(() => {
    if (!fetched) return fetched;
    const byNewest = (a: ActiveSwap, b: ActiveSwap) =>
      toNum(b.initiatedAt) - toNum(a.initiatedAt);
    const rows =
      activeFilters > 0 ? applyTxFilters(fetched, filters) : [...fetched];
    const nowSec = Math.floor(Date.now() / 1000);
    // Ascending comparator per column; direction flips it. Nulls sink to the
    // bottom of an ascending sort via the fallbacks.
    const asc = (a: ActiveSwap, b: ActiveSwap): number => {
      switch (sortCol) {
        case 'num':
          return (a.seq ?? -1) - (b.seq ?? -1);
        case 'input':
        case 'output':
          return solNotional(a) - solNotional(b);
        case 'miner':
          return String(minerLabel(a.minerHotkey) ?? '￿').localeCompare(
            String(minerLabel(b.minerHotkey) ?? '￿'),
            undefined,
            { numeric: true },
          );
        case 'age':
          return toNum(a.initiatedAt) - toNum(b.initiatedAt);
        case 'settle':
          return settleSecs(a, nowSec) - settleSecs(b, nowSec);
        case 'status':
          return a.status.localeCompare(b.status);
      }
    };
    const mul = sortDir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => mul * asc(a, b) || byNewest(a, b));
  }, [fetched, sortCol, sortDir, filters, activeFilters, minerLabel]);

  const hasInFlightRows = React.useMemo(
    () => (fetched ?? []).some((s) => !isTerminal(s)),
    [fetched],
  );
  React.useEffect(() => {
    if (!hasInFlightRows) return;
    const id = setInterval(() => {
      if (!document.hidden) setNowSec(Math.floor(Date.now() / 1000));
    }, 1_000);
    return () => clearInterval(id);
  }, [hasInFlightRows]);

  // Every route that appears in the loaded data drives the two dependent
  // From/To dropdowns (markets-composer style): each side only offers chains
  // that form a real route with the other side's pick.
  const routes = React.useMemo(() => {
    const seen = new Set<string>();
    const list: { src: string; dst: string }[] = [];
    for (const s of completeHistory ?? fetched ?? []) {
      const src = s.sourceChain?.toLowerCase();
      const dst = s.destChain?.toLowerCase();
      if (!src || !dst || seen.has(`${src}→${dst}`)) continue;
      seen.add(`${src}→${dst}`);
      list.push({ src, dst });
    }
    return list;
  }, [completeHistory, fetched]);
  const fromOptions = React.useMemo(
    () =>
      [
        ...new Set(
          routes
            .filter(
              (r) => filters.toChain === 'all' || r.dst === filters.toChain,
            )
            .map((r) => r.src),
        ),
      ].sort(),
    [routes, filters.toChain],
  );
  const toOptions = React.useMemo(
    () =>
      [
        ...new Set(
          routes
            .filter(
              (r) => filters.fromChain === 'all' || r.src === filters.fromChain,
            )
            .map((r) => r.dst),
        ),
      ].sort(),
    [routes, filters.fromChain],
  );
  // Picking one side resets the other when the combination stops being a
  // real route (e.g. From TAO forces To off BTC).
  const pickChain = (side: 'fromChain' | 'toChain', value: string) => {
    const next = { ...filters, [side]: value };
    if (
      next.fromChain !== 'all' &&
      next.toChain !== 'all' &&
      !routes.some((r) => r.src === next.fromChain && r.dst === next.toChain)
    ) {
      next[side === 'fromChain' ? 'toChain' : 'fromChain'] = 'all';
    }
    setFilters(next);
  };

  // Reset limit when search changes
  React.useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [debouncedSearch]);

  // Paging watches the RAW page (a filtered page can be shorter than limit
  // while more rows exist server-side); the complete-history path has nothing
  // left to page.
  const hasMore = !exactSwapId && !usingComplete && fetched?.length === limit;
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setLimit((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  return isLoading && !swaps ? (
    <SwapTrackerSkeleton />
  ) : (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {!embedded && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
          >
            Transactions
          </Typography>
          <Tooltip
            title={
              <Box sx={{ maxWidth: 280 }}>
                Every transaction on the network in chronological order, with
                its current status and progress through the lifecycle: Initiated
                → Fulfilled → Completed (or Timed Out). Click a row to see the
                full timeline.
              </Box>
            }
            arrow
            placement="right"
          >
            <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* One find-a-transaction card: search, filters, and the all-time
          count share a single surface. */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          p: { xs: 1.25, sm: 1.5 },
          mb: 1,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by transaction # or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 1.25,
            width: '100%',
            '& .MuiOutlinedInput-root': {
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              color: 'text.primary',
              borderRadius: 0,
              height: 32,
              backgroundColor: 'background.default',
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: theme.palette.border.light },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />

        {/* Kraken-style find filters — always visible. */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 1,
          }}
        >
          {/* Dependent From/To chain pickers, markets-composer style: each
              side only offers real routes given the other side's pick. */}
          <FilterField label="From" active={filters.fromChain !== 'all'}>
            <TextField
              select
              SelectProps={{ native: true }}
              size="small"
              value={filters.fromChain}
              onChange={(e) => pickChain('fromChain', e.target.value)}
              sx={{
                width: 96,
                ...filterFieldSx(theme, filters.fromChain !== 'all'),
              }}
            >
              <option value="all">ALL</option>
              {fromOptions.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </TextField>
          </FilterField>
          <FilterField label="To" active={filters.toChain !== 'all'}>
            <TextField
              select
              SelectProps={{ native: true }}
              size="small"
              value={filters.toChain}
              onChange={(e) => pickChain('toChain', e.target.value)}
              sx={{
                width: 96,
                ...filterFieldSx(theme, filters.toChain !== 'all'),
              }}
            >
              <option value="all">ALL</option>
              {toOptions.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </TextField>
          </FilterField>
          <FilterField label="Status" active={filters.status !== 'all'}>
            <TextField
              select
              SelectProps={{ native: true }}
              size="small"
              value={filters.status}
              onChange={(e) =>
                setFilter('status', e.target.value as StatusFilter)
              }
              sx={{
                width: 130,
                ...filterFieldSx(theme, filters.status !== 'all'),
              }}
            >
              <option value="all">ALL</option>
              <option value="completed">COMPLETED</option>
              <option value="timed_out">TIMED OUT</option>
              <option value="in_flight">IN FLIGHT</option>
            </TextField>
          </FilterField>
          <FilterField label="From date" active={!!filters.dateFrom}>
            <TextField
              type="date"
              size="small"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
              sx={{ width: 140, ...filterFieldSx(theme, !!filters.dateFrom) }}
            />
          </FilterField>
          <FilterField label="To date" active={!!filters.dateTo}>
            <TextField
              type="date"
              size="small"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo', e.target.value)}
              sx={{ width: 140, ...filterFieldSx(theme, !!filters.dateTo) }}
            />
          </FilterField>
          <FilterField label="Min (SOL)" active={!!filters.minSol}>
            <TextField
              type="number"
              size="small"
              placeholder="0.0"
              inputProps={{ min: 0, step: 0.1 }}
              value={filters.minSol}
              onChange={(e) => setFilter('minSol', e.target.value)}
              sx={{ width: 90, ...filterFieldSx(theme, !!filters.minSol) }}
            />
          </FilterField>
          <FilterField label="Max (SOL)" active={!!filters.maxSol}>
            <TextField
              type="number"
              size="small"
              placeholder="∞"
              inputProps={{ min: 0, step: 0.1 }}
              value={filters.maxSol}
              onChange={(e) => setFilter('maxSol', e.target.value)}
              sx={{ width: 90, ...filterFieldSx(theme, !!filters.maxSol) }}
            />
          </FilterField>
          {activeFilters > 0 && (
            <Box
              component="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600,
                // Inverted chip — the loudest element in the bar whenever
                // any filter is narrowing the list.
                color: theme.palette.background.paper,
                backgroundColor: theme.palette.text.primary,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                px: 1,
                whiteSpace: 'nowrap',
                '&:hover': { opacity: 0.85 },
              }}
            >
              ✕ Clear
            </Box>
          )}
          {swapsCount != null && (
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: { xs: '0.58rem', sm: '0.65rem' },
                color: 'text.secondary',
                ml: 'auto',
                alignSelf: 'flex-end',
                pb: 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              {/* With filters live, the same slot shows the match count over
                  the total (compact, so the row never wraps). */}
              {activeFilters > 0 && swaps != null ? (
                <>
                  <Box component="span" sx={{ color: 'text.primary' }}>
                    {swaps.length.toLocaleString()} match
                    {swaps.length === 1 ? '' : 'es'}
                  </Box>
                  {' / '}
                  {swapsCount.totalCount.toLocaleString()}
                </>
              ) : (
                <>
                  {swapsCount.totalCount.toLocaleString()} transaction
                  {swapsCount.totalCount === 1 ? '' : 's'} all-time
                </>
              )}
            </Typography>
          )}
        </Box>
      </Box>

      {!swaps?.length ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 0,
            backgroundColor: 'surface.light',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontFamily: FONTS.mono,
              fontSize: { xs: '0.72rem', sm: '0.8rem' },
            }}
          >
            {search || activeFilters > 0
              ? 'No matching transactions'
              : 'No transactions yet'}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Column header — same grid template as the row cards below. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID_COLS,
              gap: 1,
              px: { xs: 1.25, sm: 1.5 },
              mb: 0.5,
            }}
          >
            {(
              [
                ['num', '#'],
                ['input', 'From'],
                ['output', 'To'],
                ['miner', 'Miner'],
                ['age', 'Time'],
                ['settle', 'Settle'],
                ['status', 'Status'],
              ] as [SortCol, string][]
            ).map(([col, label]) => (
              <SortHeader
                key={col}
                label={label}
                active={sortCol === col}
                dir={sortDir}
                onClick={() => handleSort(col)}
                hideXs={col === 'miner' || col === 'age' || col === 'settle'}
                alignRight={col === 'status'}
              />
            ))}
          </Box>
          <Box
            ref={scrollRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.border.light,
                borderRadius: 0,
              },
            }}
          >
            <Stack spacing={1}>
              {swaps.map((swap) => {
                const color = getStatusColor(swap.status, theme.palette);
                // In-flight rows backfill missing fields from their live
                // reservation so PENDING shows real data, not dashes.
                const res = !isTerminal(swap)
                  ? (reservationBySwapId.get(swap.swapId) ??
                    reservationByUserPrefix.get(
                      swap.userAddress?.slice(0, 8) ?? '',
                    ) ??
                    undefined)
                  : undefined;
                const sourceChain = swap.sourceChain ?? res?.fromChain ?? null;
                const sourceAmount =
                  swap.sourceAmount ?? res?.fromAmount ?? null;
                const destChain = swap.destChain ?? res?.toChain ?? null;
                const destAmount = swap.destAmount ?? res?.toAmount ?? null;
                const sentLine =
                  sourceAmount && sourceChain
                    ? formatAmount(sourceAmount, sourceChain)
                    : swap.solAmount
                      ? `${lamportsToSol(swap.solAmount).toFixed(4)} SOL`
                      : null;
                const recvLine =
                  destAmount && destChain
                    ? formatAmount(destAmount, destChain)
                    : null;
                const miner = minerLabel(
                  swap.minerHotkey ?? res?.minerHotkey ?? null,
                );
                const resolved = swap.resolvedAt ?? swap.completedAt;
                // Terminal rows show their real settle time; in-flight rows
                // show elapsed-so-far.
                let settle = '—';
                if (isTerminal(swap) && resolved && swap.initiatedAt) {
                  settle = formatDurationSecs(
                    toNum(resolved) - toNum(swap.initiatedAt),
                  );
                }
                return (
                  <Box
                    key={swap.swapId}
                    component={RouterLink}
                    to={`/swap/${swap.swapId}`}
                    sx={{
                      // House card treatment (Card.tsx): square bordered paper
                      // surface, hover fill — one card per transaction, laid
                      // out on the shared table grid. Click-through to the
                      // transaction's own page for full details.
                      display: 'grid',
                      gridTemplateColumns: GRID_COLS,
                      gap: 1,
                      alignItems: 'center',
                      px: { xs: 1.25, sm: 1.5 },
                      py: { xs: 1.25, sm: 1 },
                      borderRadius: 0,
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: 'background.paper',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s, border-color 0.15s',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        borderColor: 'border.light',
                      },
                    }}
                  >
                    <Typography sx={statCellSx}>
                      {swapDisplayId(swap)}
                    </Typography>
                    {/* What went in, with the sending wallet inline when we
                        actually know it: the explicit per-leg field, or the
                        protocol address when the source leg IS Solana. A
                        non-SOL source with neither shows no address (the
                        chain data doesn't carry the sender yet). */}
                    <Box
                      sx={{
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 0.75,
                        overflow: 'hidden',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          fontWeight: 600,
                          color: 'text.primary',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sentLine ?? '—'}
                      </Typography>
                      {(() => {
                        const fromWallet =
                          swap.userSourceAddress ??
                          res?.userFromAddress ??
                          (sourceChain?.toLowerCase() === hubChain()
                            ? swap.userAddress
                            : null);
                        return fromWallet ? (
                          <Box
                            component="span"
                            sx={{ display: { xs: 'none', sm: 'inline' } }}
                          >
                            <CopyableAddress
                              address={fromWallet}
                              fontSize="0.6rem"
                            />
                          </Box>
                        ) : null;
                      })()}
                    </Box>
                    {/* Amount, then the payout address inline — keeps the
                        row a single short line. Address hides on phones
                        where it can't fit. */}
                    <Box
                      sx={{
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 0.75,
                        overflow: 'hidden',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          fontWeight: 600,
                          color: 'text.primary',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {recvLine ?? '—'}
                      </Typography>
                      {(() => {
                        // Same chain-aware rule as From: the protocol (SOL)
                        // address only stands in when the dest leg IS Solana.
                        const toWallet =
                          swap.userDestAddress ??
                          (destChain?.toLowerCase() === hubChain()
                            ? swap.userAddress
                            : null);
                        return toWallet ? (
                          <Box
                            component="span"
                            sx={{ display: { xs: 'none', sm: 'inline' } }}
                          >
                            <CopyableAddress
                              address={toWallet}
                              fontSize="0.6rem"
                            />
                          </Box>
                        ) : null;
                      })()}
                    </Box>
                    <Typography sx={{ ...statCellSx, ...HIDE_XS }}>
                      {miner ?? '—'}
                    </Typography>
                    {/* Time + Settle: terminal rows are static; in-flight
                        rows tick live off a real timestamp. */}
                    {isTerminal(swap) ? (
                      <>
                        <Box sx={HIDE_XS}>
                          <Typography sx={statCellSx}>
                            {exactTime(swap.initiatedAt)}
                          </Typography>
                          <Typography
                            sx={{
                              ...statCellSx,
                              fontSize: '0.56rem',
                              color: 'text.disabled',
                            }}
                          >
                            {formatTimeAgo(swap.initiatedAt, nowSec * 1000)}
                          </Typography>
                        </Box>
                        <Typography sx={{ ...statCellSx, ...HIDE_XS }}>
                          {settle}
                        </Typography>
                      </>
                    ) : (
                      <LiveTimeSettle
                        swap={swap}
                        reservedAt={res?.reservedAt}
                        nowSec={nowSec}
                      />
                    )}
                    {/* Status; in-flight rows also stream their latest
                        lifecycle event so watchers see progress live. */}
                    <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: { xs: '0.58rem', sm: '0.65rem' },
                          color,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {swap.status.replace('_', ' ')}
                      </Typography>
                      {!isTerminal(swap) && (
                        <LatestEventCell swapId={swap.swapId} />
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SwapTracker;
