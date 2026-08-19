import React from 'react';
import { Box, Popover, Typography, useTheme, type Theme } from '@mui/material';
import { FONTS } from '../../theme';
import SelectMenu from './SelectMenu';

// The tape's date filter: one field that opens a range picker with quick
// presets beside it (the shape Kraken's ledger uses), in the site's mono
// treatment. Two CONSECUTIVE months are on screen — never the same month
// twice — and clicks walk start then end. Dates are day-granular `yyyy-mm-dd`
// strings, the same values the URL carries.

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const parseIso = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const startOfMonth = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), 1);

const addMonths = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// "Aug 11" / "Aug 11, 2025" — the year only when it isn't the current one.
const short = (d: Date, now: Date): string =>
  d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });

const labelFor = (from: string, to: string, now: Date): string => {
  const f = parseIso(from);
  const t = parseIso(to);
  if (f && t) return `${short(f, now)} – ${short(t, now)}`;
  if (f) return `From ${short(f, now)}`;
  if (t) return `Until ${short(t, now)}`;
  return 'All time';
};

// Every month from `min` to `max` inclusive, oldest first — the options a
// panel's dropdowns offer. The tape can't show a month with no data behind
// it, so the list stops at the first transaction and at today.
const monthsBetween = (min: Date, max: Date): Date[] => {
  const out: Date[] = [];
  for (let m = startOfMonth(min); m <= max; m = addMonths(m, 1)) out.push(m);
  return out;
};

// Which two months to show for a given selection: the pair ending on the
// range's LAST month, so both endpoints of every preset are on screen and the
// right-hand panel is the one the range runs into.
const viewFor = (from: string, to: string, today: Date): Date =>
  addMonths(startOfMonth(parseIso(to) ?? parseIso(from) ?? today), -1);

// Preset → the [from, to] it writes. '' on both clears the filter.
const presets = (now: Date): { label: string; range: [string, string] }[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = startOfMonth(today);
  const lastMonth = addMonths(thisMonth, -1);
  return [
    { label: 'Today', range: [iso(today), iso(today)] },
    { label: 'Last 7 days', range: [iso(addDays(today, -6)), iso(today)] },
    { label: 'Last 30 days', range: [iso(addDays(today, -29)), iso(today)] },
    { label: 'This month', range: [iso(thisMonth), iso(today)] },
    {
      label: 'Last month',
      range: [iso(lastMonth), iso(addDays(thisMonth, -1))],
    },
    {
      label: 'Year to date',
      range: [iso(new Date(today.getFullYear(), 0, 1)), iso(today)],
    },
    { label: 'All time', range: ['', ''] },
  ];
};

const chipSx = (theme: Theme, active: boolean) => ({
  all: 'unset' as const,
  cursor: 'pointer',
  fontFamily: FONTS.mono,
  fontSize: '0.65rem',
  whiteSpace: 'nowrap' as const,
  px: 1,
  py: 0.5,
  color: active ? theme.palette.background.paper : theme.palette.text.secondary,
  backgroundColor: active ? theme.palette.text.primary : 'transparent',
  '&:hover': {
    backgroundColor: active
      ? theme.palette.text.primary
      : theme.palette.action.hover,
  },
});

const navSx = (disabled: boolean) => ({
  all: 'unset' as const,
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: FONTS.mono,
  fontSize: '0.72rem',
  color: disabled ? 'text.disabled' : 'text.secondary',
  px: 0.75,
  '&:hover': disabled ? {} : { color: 'text.primary' },
});

// The month + year dropdowns a panel carries. `months` is that panel's whole
// allowed window, so the year list stops at the first transaction and the
// month list only offers months that year actually holds.
const MonthYearControls: React.FC<{
  month: Date;
  months: Date[];
  onMonth: (next: Date) => void;
}> = ({ month, months, onMonth }) => {
  const years = React.useMemo(
    () => [...new Set(months.map((m) => m.getFullYear()))],
    [months],
  );
  const inYear = React.useMemo(
    () => months.filter((m) => m.getFullYear() === month.getFullYear()),
    [months, month],
  );
  // Switching year keeps the closest month that year actually offers.
  const pickYear = (year: number) => {
    const candidates = months.filter((m) => m.getFullYear() === year);
    if (!candidates.length) return;
    const same = candidates.find((m) => m.getMonth() === month.getMonth());
    onMonth(same ?? candidates[candidates.length - 1]);
  };
  return (
    <>
      <SelectMenu
        ariaLabel="Month"
        value={month.getMonth()}
        label={MONTHS[month.getMonth()]}
        options={inYear.map((m) => ({
          value: m.getMonth(),
          label: MONTHS[m.getMonth()],
        }))}
        onChange={(m) => onMonth(new Date(month.getFullYear(), m, 1))}
        grow
        height={22}
      />
      <SelectMenu
        ariaLabel="Year"
        value={month.getFullYear()}
        label={String(month.getFullYear())}
        options={years.map((y) => ({ value: y, label: String(y) }))}
        onChange={pickYear}
        height={22}
      />
    </>
  );
};

// One month grid. The header is supplied by the caller so each panel can pair
// its dropdowns with the arrow that belongs on its side.
const MonthGrid: React.FC<{
  month: Date;
  header: React.ReactNode;
  from: string;
  to: string;
  max: Date;
  onPick: (day: string) => void;
}> = ({ month, header, from, to, max, onPick }) => {
  const theme = useTheme();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = startOfMonth(month).getDay();

  const cellSx = (inRange: boolean, edge: boolean, off: boolean) => ({
    all: 'unset' as const,
    boxSizing: 'border-box' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    cursor: off ? 'default' : 'pointer',
    color: off
      ? theme.palette.text.disabled
      : edge
        ? theme.palette.background.paper
        : theme.palette.text.primary,
    backgroundColor: edge
      ? theme.palette.text.primary
      : inRange
        ? theme.palette.action.hover
        : 'transparent',
    '&:hover': off
      ? {}
      : {
          backgroundColor: edge
            ? theme.palette.text.primary
            : theme.palette.action.selected,
        },
  });

  return (
    <Box sx={{ minWidth: 196 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          height: 24,
          mb: 0.75,
        }}
      >
        {header}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DOW.map((d) => (
          <Typography
            key={d}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.56rem',
              color: 'text.disabled',
              textAlign: 'center',
              pb: 0.25,
            }}
          >
            {d}
          </Typography>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <Box key={`lead-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = iso(
            new Date(month.getFullYear(), month.getMonth(), i + 1),
          );
          const off = parseIso(key)! > max;
          const edge = key === from || key === to;
          const inRange = !!from && !!to && key > from && key < to;
          return (
            <Box
              key={key}
              component="button"
              disabled={off}
              onClick={() => onPick(key)}
              sx={cellSx(inRange, edge, off)}
            >
              {i + 1}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const DateRangeField: React.FC<{
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  // First transaction on the network: nothing before it is worth offering.
  minDate?: Date | null;
  // Fired the first time the picker opens, so the caller can defer fetching
  // the bounds until someone actually reaches for the calendar.
  onOpen?: () => void;
  fieldSx?: object;
}> = ({ from, to, onChange, minDate, onOpen, fieldSx }) => {
  const theme = useTheme();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const now = React.useMemo(() => new Date(), []);
  const today = React.useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now],
  );
  const active = !!from || !!to;

  // The left-hand month; the right is always the one after it.
  const [view, setView] = React.useState(() => viewFor(from, to, today));
  const rightView = addMonths(view, 1);

  const open = (e: React.MouseEvent<HTMLElement>) => {
    // Reopening lands on the current selection, wherever it sits.
    setView(viewFor(from, to, today));
    setAnchor(e.currentTarget);
    onOpen?.();
  };

  // One click sequence, no From/To panels to keep straight: the first click
  // sets the start (and opens the range), the next one closes it. Clicking
  // before the start, or on a finished range, starts over.
  const pick = (day: string) => {
    if (!from || (!!from && !!to) || day < from) onChange(day, '');
    else onChange(from, day);
  };

  // The two panels walk one window: the right one can reach from the first
  // transaction's month to this month, the left one sits a month behind it.
  const { leftMonths, rightMonths } = React.useMemo(() => {
    const maxRight = startOfMonth(today);
    // Until the first-transaction date lands — and if that query never
    // answers — fall back to a two-year window rather than locking the
    // calendar to this month with a one-option dropdown.
    const minRight = startOfMonth(minDate ?? addMonths(today, -23));
    const right = monthsBetween(
      minRight <= maxRight ? minRight : maxRight,
      maxRight,
    );
    return {
      rightMonths: right,
      leftMonths: right.map((m) => addMonths(m, -1)),
    };
  }, [minDate, today]);

  const atStart = view <= leftMonths[0];
  const atEnd = view >= leftMonths[leftMonths.length - 1];

  return (
    <>
      <Box
        component="button"
        onClick={open}
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          height: 28,
          px: 1,
          minWidth: 168,
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          color: active ? 'text.primary' : 'text.secondary',
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: active ? theme.palette.text.primary : 'divider',
          ...(active && { borderWidth: 2 }),
          '&:hover': { borderColor: theme.palette.border.light },
          ...fieldSx,
        }}
      >
        <Box component="span" sx={{ flex: 1 }}>
          {labelFor(from, to, now)}
        </Box>
        {active && (
          <Box
            component="span"
            role="button"
            aria-label="Clear dates"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onChange('', '');
            }}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            ✕
          </Box>
        )}
      </Box>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              backgroundImage: 'none',
              mt: 0.5,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Quick filters: the ranges people actually ask for, one click. */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25,
              p: 1,
              borderRight: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.56rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                mb: 0.5,
              }}
            >
              Quick filters
            </Typography>
            {presets(now).map(({ label, range }) => (
              <Box
                key={label}
                component="button"
                onClick={() => {
                  onChange(range[0], range[1]);
                  setView(viewFor(range[0], range[1], today));
                }}
                sx={{
                  ...chipSx(theme, from === range[0] && to === range[1]),
                  textAlign: 'left',
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, p: 1.5 }}>
            <MonthGrid
              month={view}
              from={from}
              to={to}
              max={today}
              onPick={pick}
              header={
                <>
                  <Box
                    component="button"
                    aria-label="Previous month"
                    disabled={atStart}
                    onClick={() => setView(addMonths(view, -1))}
                    sx={navSx(atStart)}
                  >
                    ‹
                  </Box>
                  <MonthYearControls
                    month={view}
                    months={leftMonths}
                    onMonth={setView}
                  />
                </>
              }
            />
            <MonthGrid
              month={rightView}
              from={from}
              to={to}
              max={today}
              onPick={pick}
              header={
                <>
                  {/* The panels stay consecutive: setting the right month
                      walks the left one to the month before it. */}
                  <MonthYearControls
                    month={rightView}
                    months={rightMonths}
                    onMonth={(m) => setView(addMonths(m, -1))}
                  />
                  <Box
                    component="button"
                    aria-label="Next month"
                    disabled={atEnd}
                    onClick={() => setView(addMonths(view, 1))}
                    sx={navSx(atEnd)}
                  >
                    ›
                  </Box>
                </>
              }
            />
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default DateRangeField;
