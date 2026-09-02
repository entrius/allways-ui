import React, { useState, useCallback, useRef } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  useAllSwaps,
  useDirections,
  useHistory,
  useMinerLabel,
  useProtocolConstants,
  useSwapDetail,
  useSwapsCount,
  type SwapQuery,
} from '../../api';
import { displayEventType } from '../../api/models';
import CopyableAddress from '../CopyableAddress';
import SearchField, { terminalFieldSx } from '../SearchField';
import { FONTS } from '../../theme';
import { SwapTrackerSkeleton } from './Skeletons';
import {
  applyFee,
  formatAmount,
  formatDurationSecs,
  formatTimeAgo,
  lamportsToSol,
  swapDisplayId,
} from '../../utils/format';
import { hubChain } from '../../api/models/chains';
import RangeChips from '../RangeChips';
import SelectMenu from './SelectMenu';
import DateRangeField from './DateRangeField';
import { useLiveAnchor, useReservationLookup } from './liveSwapAnchor';
import {
  countActiveFilters,
  DEFAULT_PAGE_SIZE,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  isTerminal,
  toNum,
  type StatusFilter,
  type TxFilters,
} from './txFilters';

// Rows per page, explorer-style (mempool.space / Solscan / TaoStats all put
// the same picker beside the pager). URL-backed, so a page is shareable.
const PAGE_SIZES = ['10', '50', '100'] as const;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'completed', label: 'COMPLETED' },
  { value: 'timed_out', label: 'TIMED OUT' },
  { value: 'cancelled', label: 'CANCELLED' },
  { value: 'in_flight', label: 'IN FLIGHT' },
];

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
  // green / timed-out red / cancelled amber. In-flight states stay neutral.
  const map: Record<string, string> = {
    ACTIVE: palette.text.secondary,
    FULFILLED: palette.text.secondary,
    COMPLETED: 'var(--color-success)',
    TIMED_OUT: 'var(--color-danger)',
    CANCELLED: 'var(--color-warning)',
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

// One step of the pager: a square mono button, muted until it can actually
// take you somewhere.
const PagerButton: React.FC<{
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}> = ({ label, title, disabled, onClick }) => (
  <Tooltip title={title} arrow placement="top">
    <Box component="span">
      <Box
        component="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          border: '1px solid',
          borderColor: 'divider',
          color: disabled ? 'text.disabled' : 'text.secondary',
          cursor: disabled ? 'default' : 'pointer',
          '&:hover': disabled
            ? {}
            : { backgroundColor: 'action.hover', color: 'text.primary' },
        }}
      >
        {label}
      </Box>
    </Box>
  </Tooltip>
);

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
  // The search field takes whatever width the fixed fields leave.
  grow?: boolean;
  children: React.ReactNode;
}> = ({ label, active, grow, children }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
      ...(grow && { flex: '1 1 220px', minWidth: 0 }),
    }}
  >
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
// `anchor` is the shared start time (useLiveAnchor), so this counter and the
// pulse's rising dot always read the same elapsed.
const LiveTimeSettle: React.FC<{
  anchor: number;
  nowSec: number;
}> = ({ anchor, nowSec }) => {
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

  // The URL query string is the source of truth for filters and sort, so
  // any filtered/sorted view is shareable and the pulse chart reads the
  // exact same state. Defaults are omitted from the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = React.useMemo(
    () => filtersFromParams(searchParams),
    [searchParams],
  );
  const setFilters = (next: TxFilters) => {
    // A narrowed list is a new list: never leave the reader on page 7 of it.
    const p = filtersToParams(next, searchParams);
    p.delete('page');
    setSearchParams(p, { replace: true });
  };
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
    p.delete('page');
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

  // Paging lives in the URL next to the filters: ?page=3&size=100. Page is
  // 1-based on the wire (what the pager shows) and clamped to >= 1.
  const sizeParam = searchParams.get('size') ?? '';
  const pageSize = (PAGE_SIZES as readonly string[]).includes(sizeParam)
    ? parseInt(sizeParam, 10)
    : DEFAULT_PAGE_SIZE;
  const pageParam = parseInt(searchParams.get('page') ?? '', 10);
  const page = Number.isFinite(pageParam) && pageParam > 1 ? pageParam : 1;
  const scrollRef = useRef<HTMLDivElement>(null);
  const setPageParams = useCallback(
    (next: { page?: number; size?: number }) => {
      const p = new URLSearchParams(searchParams);
      if (next.size != null) {
        if (next.size === DEFAULT_PAGE_SIZE) p.delete('size');
        else p.set('size', String(next.size));
      }
      // Any size change lands the reader back on page 1 — the old offset
      // means nothing once the window resizes.
      const nextPage = next.size != null ? 1 : (next.page ?? 1);
      if (nextPage <= 1) p.delete('page');
      else p.set('page', String(nextPage));
      setSearchParams(p, { replace: true });
      // A new page starts at the top of the tape, not mid-scroll.
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [searchParams, setSearchParams],
  );
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

  // Every narrowing rule, resolved by das: the tape asks for one page of rows
  // and one count, no matter how the view is filtered or sorted. Dates go as
  // unix seconds so the server bounds on the reader's own local day.
  const query: SwapQuery = React.useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      fromChain: filters.fromChain === 'all' ? undefined : filters.fromChain,
      toChain: filters.toChain === 'all' ? undefined : filters.toChain,
      timeFrom: filters.dateFrom
        ? Math.floor(Date.parse(`${filters.dateFrom}T00:00:00`) / 1000)
        : undefined,
      timeTo: filters.dateTo
        ? Math.floor(Date.parse(`${filters.dateTo}T23:59:59`) / 1000)
        : undefined,
      minNotional: filters.minSol ? Number(filters.minSol) : undefined,
      maxNotional: filters.maxSol ? Number(filters.maxSol) : undefined,
    }),
    [debouncedSearch, filters],
  );

  const { data: detail, isLoading: detailLoading } = useSwapDetail(exactSwapId);
  const { data: fuzzy, isLoading: fuzzyLoading } = useAllSwaps(
    exactSeq
      ? { seq: Number(exactSeq) }
      : {
          ...query,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          sort: isDefaultSort ? undefined : sortCol,
          dir: sortDir,
        },
    !exactSwapId,
  );
  // Two counts: what this view matches (drives the pager) and the all-time
  // total behind it (context in the same readout). The all-time one is a
  // separate cached query, so filtering never refetches it — and it IS the
  // match count when nothing is narrowing, so an unfiltered view doesn't run
  // the same query twice. An exact #N / id lookup counts itself: das would
  // otherwise answer with a LIKE-over-everything count (searching "3" counts
  // every id and address containing a 3) and the pager would offer pages of
  // one row.
  const exactLookup = !!exactSwapId || !!exactSeq;
  const narrowed = activeFilters > 0 || !!debouncedSearch;
  const { data: matchCountData } = useSwapsCount(
    narrowed && !exactLookup ? query : undefined,
  );
  const { data: swapsCount } = useSwapsCount();
  const minerLabel = useMinerLabel();
  // The date picker only offers months back to the network's first
  // transaction; the all-time weekly rollup is the cheapest way to know when
  // that was (its first bucket is the week the first swap landed). Nothing on
  // screen needs it until the picker opens, so it stays unfetched until then.
  const [datePickerUsed, setDatePickerUsed] = useState(false);
  const { data: allTimeWeeks } = useHistory(
    'all',
    'week',
    datePickerUsed || !!filters.dateFrom || !!filters.dateTo,
  );
  const firstTxDate = React.useMemo(() => {
    const t = allTimeWeeks?.find((r) => r.swaps > 0)?.t ?? allTimeWeeks?.[0]?.t;
    return t ? new Date(t) : null;
  }, [allTimeWeeks]);

  const fetched = React.useMemo(
    () => (exactSwapId ? (detail?.swap ? [detail.swap] : []) : fuzzy),
    [exactSwapId, detail, fuzzy],
  );
  const isLoading = exactSwapId ? detailLoading : fuzzyLoading;

  // The live reservation behind an in-flight row (pair, amounts, miner,
  // proven from-wallet) and the shared start time its counter runs from.
  const reservationFor = useReservationLookup();
  const { data: protocol } = useProtocolConstants();
  const liveAnchor = useLiveAnchor(fetched, reservationFor);

  // das returns the page already filtered and ranked, so the rows render as
  // they arrive — no client-side pass over a full history.
  const swaps = fetched;

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

  // Every route the network supports drives the two dependent From/To
  // dropdowns (markets-composer style): each side only offers chains that
  // form a real route with the other side's pick. Straight from the chain
  // registry, so the options don't depend on what happens to be on screen.
  const directions = useDirections();
  const routes = React.useMemo(
    () =>
      directions.map((d) => {
        const [src, dst] = d.toLowerCase().split('-');
        return { src, dst };
      }),
    [directions],
  );
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

  // A new search is a new result set — back to page 1.
  const searchRef = useRef(debouncedSearch);
  React.useEffect(() => {
    if (searchRef.current === debouncedSearch) return;
    searchRef.current = debouncedSearch;
    setPageParams({ page: 1 });
  }, [debouncedSearch, setPageParams]);

  // What the pager knows. The server pages the default view (offset/limit on
  // /swaps), so its rows ARE the page; the complete-history path already holds
  // every match in memory and slices locally. A search's total is unknown
  // server-side, so the pager runs open-ended off a full last page.
  const totalRows = exactLookup
    ? (fetched?.length ?? 0)
    : narrowed
      ? (matchCountData?.totalCount ?? null)
      : (swapsCount?.totalCount ?? null);
  const totalPages =
    totalRows == null ? null : Math.max(1, Math.ceil(totalRows / pageSize));
  // The fetched page IS the page: das applied the filters, the sort, and the
  // offset.
  const pageRows = swaps ?? [];
  const hasNext =
    totalPages != null ? page < totalPages : (fetched?.length ?? 0) >= pageSize;
  const firstRowNum = pageRows.length ? (page - 1) * pageSize + 1 : 0;
  const lastRowNum = (page - 1) * pageSize + pageRows.length;
  const matchAtLeast = narrowed && totalRows == null && hasNext;

  // A filter that shrinks the list past the current page pulls the reader
  // back to the last one that still has rows.
  React.useEffect(() => {
    if (totalPages != null && page > totalPages)
      setPageParams({ page: totalPages });
  }, [totalPages, page, setPageParams]);

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
        {/* Kraken-style find bar — search and filters on one line, always
            visible. Search takes the slack; the rest keep their widths and
            wrap underneath on a narrow viewport. */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 1,
          }}
        >
          <FilterField label="Search" active={!!search} grow>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Transaction # or address..."
              ariaLabel="Search transactions"
              sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 200 } }}
            />
          </FilterField>
          {/* Dependent From/To chain pickers, markets-composer style: each
              side only offers real routes given the other side's pick. */}
          <FilterField label="From" active={filters.fromChain !== 'all'}>
            <SelectMenu
              ariaLabel="From chain"
              value={filters.fromChain}
              options={[
                { value: 'all', label: 'ALL' },
                ...fromOptions.map((c) => ({
                  value: c,
                  label: c.toUpperCase(),
                })),
              ]}
              onChange={(v) => pickChain('fromChain', v)}
              active={filters.fromChain !== 'all'}
              width={96}
            />
          </FilterField>
          <FilterField label="To" active={filters.toChain !== 'all'}>
            <SelectMenu
              ariaLabel="To chain"
              value={filters.toChain}
              options={[
                { value: 'all', label: 'ALL' },
                ...toOptions.map((c) => ({ value: c, label: c.toUpperCase() })),
              ]}
              onChange={(v) => pickChain('toChain', v)}
              active={filters.toChain !== 'all'}
              width={96}
            />
          </FilterField>
          <FilterField label="Status" active={filters.status !== 'all'}>
            <SelectMenu
              ariaLabel="Status"
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(v) => setFilter('status', v)}
              active={filters.status !== 'all'}
              width={130}
            />
          </FilterField>
          <FilterField
            label="Date"
            active={!!filters.dateFrom || !!filters.dateTo}
          >
            <DateRangeField
              from={filters.dateFrom}
              to={filters.dateTo}
              minDate={firstTxDate}
              onOpen={() => setDatePickerUsed(true)}
              onChange={(dateFrom, dateTo) =>
                setFilters({ ...filters, dateFrom, dateTo })
              }
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
              sx={{ width: 90, ...terminalFieldSx(theme, !!filters.minSol) }}
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
              sx={{ width: 90, ...terminalFieldSx(theme, !!filters.maxSol) }}
            />
          </FilterField>
          {/* Clear closes the row, with the filters it clears. It's always
              there — greyed out when there's nothing to clear — so the row
              reads as complete and nothing moves when a filter lands. */}
          <Box
            component="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            disabled={activeFilters === 0}
            tabIndex={activeFilters === 0 ? -1 : 0}
            sx={{
              all: 'unset',
              boxSizing: 'border-box',
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              // Same weight as the fields it sits beside: an outlined
              // control, not a slab. It only earns ink on hover.
              // Live, it wears the same heavy black outline as the filter
              // fields that are doing the narrowing; idle, it recedes to a
              // plain divider like the untouched fields around it.
              color: activeFilters > 0 ? 'text.primary' : 'text.disabled',
              border: '1px solid',
              borderColor:
                activeFilters > 0 ? theme.palette.text.primary : 'divider',
              ...(activeFilters > 0 && { borderWidth: 2 }),
              height: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              whiteSpace: 'nowrap',
              cursor: activeFilters > 0 ? 'pointer' : 'default',
              '&:hover': activeFilters > 0 ? { opacity: 0.7 } : {},
            }}
          >
            <Box component="span" sx={{ fontSize: '0.7rem' }}>
              ✕
            </Box>
            Clear
          </Box>
        </Box>
      </Box>

      {!pageRows.length ? (
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
              pt: 0.25,
              pb: 0.75,
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
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              // The headings above ARE the tape's header; one rule separates
              // them from the rows, as on the markets rail.
              borderTop: '1px solid',
              borderColor: 'divider',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.border.light,
                borderRadius: 0,
              },
            }}
          >
            <Stack spacing={0}>
              {pageRows.map((swap) => {
                const color = getStatusColor(swap.status, theme.palette);
                // In-flight rows backfill missing fields from their live
                // reservation so PENDING shows real data, not dashes.
                const res = reservationFor(swap);
                const sourceChain = swap.sourceChain ?? res?.fromChain ?? null;
                const sourceAmount =
                  swap.sourceAmount ?? res?.fromAmount ?? null;
                const destChain = swap.destChain ?? res?.toChain ?? null;
                // destAmount is gross; the taker receives net of the protocol
                // fee. Show delivered when known, else the net estimate, so the
                // row matches the detail page instead of over-promising.
                const destAmount =
                  swap.deliveredAmount ??
                  applyFee(
                    swap.destAmount ?? res?.toAmount ?? null,
                    protocol?.feeDivisor,
                  );
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
                      // Same treatment as the markets rail's pair rows: a
                      // flat tape, no card per transaction — a hairline rule
                      // separates rows and hover marks the one under the
                      // cursor. Click through for the transaction's details.
                      display: 'grid',
                      gridTemplateColumns: GRID_COLS,
                      gap: 1,
                      alignItems: 'center',
                      px: { xs: 1.25, sm: 1.5 },
                      py: { xs: 1, sm: 0.9 },
                      // One hairline per row, watchlist-style, so the eye
                      // tracks across the columns.
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: 'transparent',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      '&:hover': { backgroundColor: 'action.hover' },
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
                        anchor={liveAnchor(swap)}
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
          {/* Pager, explorer-style: what you're looking at on the left, rows
              per page and the page walk on the right. Sits outside the scroll
              area so it never scrolls away. */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              px: { xs: 1.25, sm: 1.5 },
              pt: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* One counts line, next to the pager it belongs to: the rows on
                screen, the size of the set they came from, and — when a
                filter or search is narrowing things — the all-time total
                behind it. A search's total is server-side and unknown past
                the current page, hence the "+". */}
            <Typography sx={{ ...statCellSx, fontSize: '0.6rem' }}>
              {firstRowNum.toLocaleString()}–{lastRowNum.toLocaleString()}
              {totalRows != null
                ? ` of ${totalRows.toLocaleString()}`
                : matchAtLeast
                  ? ` of ${lastRowNum.toLocaleString()}+`
                  : ''}
              {narrowed && swapsCount != null && (
                <Box component="span" sx={{ color: 'text.disabled' }}>
                  {' · '}
                  {swapsCount.totalCount.toLocaleString()} all-time
                </Box>
              )}
            </Typography>
            <Box
              sx={{
                ml: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ ...headCellSx, ...HIDE_XS }}>Rows</Typography>
                <RangeChips
                  value={String(pageSize)}
                  options={PAGE_SIZES}
                  onChange={(next) =>
                    setPageParams({ size: parseInt(next, 10) })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <PagerButton
                  label="«"
                  title="First page"
                  disabled={page <= 1}
                  onClick={() => setPageParams({ page: 1 })}
                />
                <PagerButton
                  label="‹"
                  title="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPageParams({ page: page - 1 })}
                />
                <Typography
                  sx={{
                    ...statCellSx,
                    fontSize: '0.6rem',
                    px: 0.75,
                    color: 'text.primary',
                  }}
                >
                  {page.toLocaleString()}
                  {totalPages != null
                    ? ` / ${totalPages.toLocaleString()}`
                    : ''}
                </Typography>
                <PagerButton
                  label="›"
                  title="Next page"
                  disabled={!hasNext}
                  onClick={() => setPageParams({ page: page + 1 })}
                />
                <PagerButton
                  label="»"
                  title="Last page"
                  disabled={totalPages == null || page >= totalPages}
                  onClick={() =>
                    totalPages != null && setPageParams({ page: totalPages })
                  }
                />
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SwapTracker;
