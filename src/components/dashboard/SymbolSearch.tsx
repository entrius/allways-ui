import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  InputBase,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import { useDirections } from '../../api';
import {
  decomposeDirection,
  lanesFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { chainName, chainSymbol } from '../../utils/format';
import { hubChains } from '../../api/models/chains';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';

// Symbol search, in the shape a terminal user already knows: type, filter,
// pick. The rail lists every route too, but the rail is for browsing a hub's
// network — this is for going straight to a route you can already name.
//
// Where a broker's search puts the VENUE on the right (OANDA, FXCM), ours
// puts the BACKING: the hub asset a route's miners post collateral in, and
// the asset you are repaid in if delivery fails. It is the closest thing this
// market has to "who is on the other side", and the hub↔hub route is the one
// that carries two.

// One value: the drawn cursor is measured against a span that has to match
// the input exactly, so the size lives in a constant rather than in two
// places that can drift.
const FIELD_FONT = '0.85rem';

const matches = (direction: Direction, query: string): boolean => {
  if (!query) return true;
  const { from, to } = decomposeDirection(direction);
  const hay = [
    from,
    to,
    `${from}${to}`,
    `${from}/${to}`,
    `${from}-${to}`,
    chainSymbol(from),
    chainSymbol(to),
    chainName(from),
    chainName(to),
    ...lanesFor(direction).map(chainSymbol),
  ]
    .join(' ')
    .toLowerCase();
  // Every whitespace-separated term must appear, so "usdc sol" narrows
  // rather than widening the way a plain substring match would.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
};

const Row: React.FC<{
  direction: Direction;
  selected: boolean;
  onSelect: (direction: Direction) => void;
}> = ({ direction, selected, onSelect }) => {
  const { from, to } = decomposeDirection(direction);
  const lanes = lanesFor(direction);
  return (
    <Box
      component="button"
      onClick={() => onSelect(direction)}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        width: '100%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 2,
        py: 1,
        backgroundColor: selected ? 'action.selected' : 'transparent',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <Box sx={{ display: 'inline-flex', position: 'relative', zIndex: 1 }}>
          <ChainLogo chain={from} size={18} />
        </Box>
        <Box sx={{ display: 'inline-flex', ml: -0.6 }}>
          <ChainLogo chain={to} size={18} />
        </Box>
      </Box>

      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'primary.main',
          whiteSpace: 'nowrap',
          minWidth: 118,
        }}
      >
        {chainSymbol(from)}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          /
        </Box>
        {chainSymbol(to)}
      </Typography>

      <Typography
        sx={{
          fontSize: '0.78rem',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}
      >
        {chainName(from)} → {chainName(to)}
      </Typography>

      {/* The venue slot: what backs this route. Marks only, no tickers —
          there are two backings in the whole market, so the logo alone
          identifies them, and spelling SOL out on every one of 62 rows adds
          a column of repeated text for nothing. The name stays reachable
          through the tooltip and the logo's alt text. */}
      <Tooltip
        title={`Backed by ${lanes.map(chainName).join(' and ')}: the collateral this route's miners post, and what a failed delivery repays in.`}
        arrow
        placement="left"
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.4}
          sx={{ flexShrink: 0 }}
        >
          <Typography
            sx={{
              fontSize: '0.68rem',
              color: 'text.disabled',
              pr: 0.25,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            backed by
          </Typography>
          {lanes.map((lane) => (
            <ChainLogo key={lane} chain={lane} size={16} />
          ))}
        </Stack>
      </Tooltip>
    </Box>
  );
};

const SymbolSearch: React.FC<{
  open: boolean;
  direction: Direction;
  onClose: () => void;
  onSelect: (direction: Direction) => void;
}> = ({ open, direction, onClose, onSelect }) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [hub, setHub] = useState<string>('all');
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);
  const [caretX, setCaretX] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Where the real caret is, in characters. Read from the input rather than
  // assumed to be end-of-string, so arrow keys and mid-text clicks move the
  // drawn cursor too.
  const syncCaret = () =>
    setCaret(inputRef.current?.selectionStart ?? query.length);

  // ...and in pixels, from the hidden span holding the text up to the caret.
  useLayoutEffect(() => {
    setCaretX(measureRef.current?.offsetWidth ?? 0);
  }, [query, caret, open]);
  const all = useDirections();
  const hubs = hubChains();

  const results = useMemo(
    () =>
      all.filter((d) => {
        if (!matches(d, query)) return false;
        if (hub === 'all') return true;
        const { from, to } = decomposeDirection(d);
        return from === hub || to === hub;
      }),
    [all, query, hub],
  );

  const pick = (d: Direction) => {
    onSelect(d);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      // Reset per opening: a search box remembering last time's query is a
      // small betrayal every time you reopen it.
      TransitionProps={{
        onEnter: () => {
          setQuery('');
          setHub('all');
          setCaret(0);
        },
      }}
      PaperProps={{
        sx: {
          backgroundImage: 'none',
          // Square. This is a terminal surface, and the rest of the market
          // page has no rounded panels for it to agree with.
          borderRadius: 0,
          // Constant size, whatever the query returns. A panel that resizes
          // on every keystroke moves the rows out from under the pointer and
          // makes the whole dialog twitch as you type; holding the frame
          // still means only the CONTENT changes. Capped so it still fits a
          // short viewport.
          height: 560,
          maxHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }} spacing={1.5}>
        <Stack direction="row" alignItems="center">
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>
            Symbol search
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            aria-label="Close"
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </Box>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.25,
            py: 0.75,
            borderRadius: 0,
            border: '1px solid',
            borderColor: focused ? 'text.primary' : 'divider',
            backgroundColor: 'var(--color-surface-light)',
            transition: 'border-color 120ms',
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          {/* A blinking block cursor, drawn rather than borrowed. The native
              caret is a hairline that is easy to miss on a field that opens
              focused, and the whole question this answers is "am I typing
              into this?". It is measured against a hidden span in the same
              font and tracks selectionStart, so it sits where the real caret
              sits even after an arrow key or a click into the middle of the
              text. The native caret is hidden so there are never two. */}
          <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Box
              component="span"
              ref={measureRef}
              aria-hidden
              sx={{
                position: 'absolute',
                visibility: 'hidden',
                whiteSpace: 'pre',
                pointerEvents: 'none',
                fontSize: FIELD_FONT,
                fontFamily: 'inherit',
              }}
            >
              {query.slice(0, caret)}
            </Box>
            <InputBase
              inputRef={inputRef}
              autoFocus
              fullWidth
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                syncCaret();
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSelect={syncCaret}
              onKeyUp={syncCaret}
              onClick={syncCaret}
              onKeyDown={(e) => {
                // Enter takes the top hit, so a route you can name is two
                // keystrokes away rather than a reach for the mouse.
                if (e.key === 'Enter' && results.length) pick(results[0]);
              }}
              placeholder="Search routes, e.g. SOL BTC or Bittensor"
              sx={{ fontSize: FIELD_FONT, caretColor: 'transparent' }}
            />
            {focused && (
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: Math.min(caretX, 9999),
                  transform: 'translateY(-50%)',
                  width: '2px',
                  height: '1.05em',
                  backgroundColor: 'text.primary',
                  pointerEvents: 'none',
                  animation: 'symbolSearchCaret 1.06s step-end infinite',
                  '@keyframes symbolSearchCaret': {
                    '0%, 55%': { opacity: 1 },
                    '56%, 100%': { opacity: 0 },
                  },
                }}
              />
            )}
          </Box>
          {/* Clear, only once there is something to clear. Focus goes back to
              the field: clearing is a step in the search, not the end of it,
              so you should be able to keep typing without reaching for the
              field again. */}
          {query && (
            <Box
              component="button"
              onClick={() => {
                setQuery('');
                setCaret(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              sx={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                flexShrink: 0,
                color: 'text.disabled',
                '&:hover': { color: 'text.secondary' },
              }}
            >
              <CancelIcon sx={{ fontSize: 17 }} />
            </Box>
          )}
        </Stack>

        {/* Hub filters. A broker splits its search by asset class; every
            route here is the same class, so the meaningful split is which
            hub settles it. */}
        <Stack direction="row" spacing={0.75}>
          {['all', ...hubs].map((h) => {
            const on = h === hub;
            return (
              <Box
                key={h}
                component="button"
                onClick={() => setHub(h)}
                sx={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 5,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: on
                    ? theme.palette.background.default
                    : theme.palette.text.secondary,
                  backgroundColor: on ? 'text.primary' : 'action.hover',
                }}
              >
                {h !== 'all' && <ChainLogo chain={h} size={13} />}
                {h === 'all' ? 'All' : `${chainSymbol(h)} hub`}
              </Box>
            );
          })}
        </Stack>
      </Stack>

      {/* Takes all remaining height and scrolls internally, so a 1-result
          query leaves empty space rather than collapsing the frame. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 1 }}>
        {results.length === 0 ? (
          <Typography
            sx={{
              px: 2,
              py: 3,
              fontSize: '0.8rem',
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            No route matches “{query}”. Spokes only trade against a hub, so
            pairs like BTC/ETH do not exist here.
          </Typography>
        ) : (
          results.map((d) => (
            <Row
              key={d}
              direction={d}
              selected={d === direction}
              onSelect={pick}
            />
          ))
        )}
      </Box>

      <Typography
        sx={{
          px: 2,
          py: 1,
          fontSize: '0.68rem',
          color: 'text.disabled',
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {results.length} of {all.length} routes · each direction is its own
        market
      </Typography>
    </Dialog>
  );
};

export default SymbolSearch;
