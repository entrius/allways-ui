import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Typography } from '@mui/material';
import {
  Responsive,
  WidthProvider,
  type Layout,
  type Layouts,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { FONTS } from '../../theme';
import { TextLinkButton } from '../Buttons';

const ResponsiveGrid = WidthProvider(Responsive);

/** One plug-in piece of a workspace. */
export type WorkspacePanel = {
  id: string;
  title: React.ReactNode;
  /** Optional right-hand slot in the panel's header (a picker, a chip). */
  aside?: React.ReactNode;
  node: React.ReactNode;
  minW?: number;
  minH?: number;
  /**
   * 'content' (default): the widget's height follows what is inside it,
   * so a sheet with rows hidden or a book with two levels takes only the
   * rows it needs. 'fill': the content stretches to the widget's height
   * from the layout (a chart).
   */
  fit?: 'content' | 'fill';
};

// The grid's units. Twelve columns on a wide screen with the landing card
// gap between them. Rows are fine, 8px each (4px row + 4px gap), so a
// widget's box can end within a few pixels of its content; the visible gap
// between widgets is made up to the landing 24px by leaving each box 20px
// short of its slot.
export const WORKSPACE_COLS = { lg: 12, md: 12, sm: 6, xs: 2 } as const;
const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 };
const ROW_HEIGHT = 4;
const GUTTER_X = 24;
const GUTTER_Y = 4;
const ROW_UNIT = ROW_HEIGHT + GUTTER_Y;
const PANEL_GAP = 24 - GUTTER_Y;
// Rows for a widget whose card (title row, border, body and its padding)
// is this tall. The grid gives a slot of h rows minus one row gap; the card
// leaves PANEL_GAP of it empty; round up to the next 8px row so the slot is
// never shorter than the card and nothing inside has to scroll.
const rowsFor = (cardPx: number) =>
  Math.max(1, Math.ceil((cardPx + PANEL_GAP + GUTTER_Y) / ROW_UNIT));

// What a browser remembers: where each widget sits, and which are put away.
type Saved = { layouts: Layouts; hidden: string[] };

// The grid reports its layout after every change of props; treat a report
// that changes nothing as nothing, or the two would ping-pong for ever.
const sameLayouts = (a: Layouts, b: Layouts): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const bp of keys) {
    const x = a[bp] ?? [];
    const y = b[bp] ?? [];
    if (x.length !== y.length) return false;
    const byId = new Map(y.map((l) => [l.i, l]));
    for (const l of x) {
      const m = byId.get(l.i);
      if (!m || m.x !== l.x || m.y !== l.y || m.w !== l.w || m.h !== l.h)
        return false;
    }
  }
  return true;
};

const readSaved = (key: string): Saved | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    if (!parsed || typeof parsed !== 'object' || !parsed.layouts) return null;
    return { layouts: parsed.layouts, hidden: parsed.hidden ?? [] };
  } catch {
    return null;
  }
};
const writeSaved = (key: string, saved: Saved) => {
  try {
    localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    // Storage may be unavailable (private mode); the desk is still live
    // for this visit.
  }
};

// Keep a stored layout honest against the current panel set: drop panels
// that no longer exist, add new ones at the bottom from the defaults.
const reconcile = (stored: Layouts, defaults: Layouts): Layouts => {
  const out: Layouts = {};
  for (const bp of Object.keys(defaults)) {
    const def = defaults[bp] ?? [];
    const have = new Map((stored[bp] ?? []).map((l) => [l.i, l]));
    const ids = new Set(def.map((l) => l.i));
    const kept = [...have.values()].filter((l) => ids.has(l.i));
    const bottom = kept.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const added = def
      .filter((l) => !have.has(l.i))
      .map((l) => ({ ...l, y: bottom + l.y }));
    out[bp] = [...kept, ...added];
  }
  return out;
};

/**
 * A terminal-style workspace: every piece of the page is a widget with a
 * fixed size that a person can put away, bring back, and drag by its title
 * to where they want it. The desk is remembered per browser. Widgets wear
 * the landing card: a square hairline, a mono title, blue on hover. Reset
 * returns the page's own desk.
 */
const Workspace: React.FC<{
  panels: WorkspacePanel[];
  /** The page's own arrangement, per breakpoint. */
  defaultLayouts: Layouts;
  /** localStorage key; bump its version suffix when the defaults change. */
  storageKey: string;
  /** Desk-wide controls (a window picker) for the bar above the widgets:
   * state every widget reads belongs to the desk, not to one of them. */
  controls?: React.ReactNode;
}> = ({ panels, defaultLayouts, storageKey, controls }) => {
  const [layouts, setLayouts] = useState<Layouts>(() => {
    const stored = readSaved(storageKey);
    return stored ? reconcile(stored.layouts, defaultLayouts) : defaultLayouts;
  });
  const [hidden, setHidden] = useState<Set<string>>(() => {
    const stored = readSaved(storageKey);
    const ids = new Set(panels.map((p) => p.id));
    return new Set((stored?.hidden ?? []).filter((id) => ids.has(id)));
  });
  const [custom, setCustom] = useState(() => readSaved(storageKey) != null);
  // False until the first content measurements have landed.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    // Two frames: one for the grid to measure its width and lay out, one
    // for the content-fit widgets to report and take their heights.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setSettled(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  useEffect(() => {
    if (custom) writeSaved(storageKey, { layouts, hidden: [...hidden] });
  }, [custom, layouts, hidden, storageKey]);

  // The grid reports only the widgets it shows; keep the put-away ones'
  // last positions so they come back where they were.
  const onLayoutChange = useCallback((_: Layout[], all: Layouts) => {
    setLayouts((prev) => {
      const out: Layouts = {};
      for (const bp of new Set([...Object.keys(prev), ...Object.keys(all)])) {
        const shown = all[bp] ?? [];
        const shownIds = new Set(shown.map((l) => l.i));
        const rest = (prev[bp] ?? []).filter((l) => !shownIds.has(l.i));
        out[bp] = [...shown, ...rest];
      }
      return sameLayouts(prev, out) ? prev : out;
    });
  }, []);
  const onUserChange = useCallback(() => setCustom(true), []);
  const remove = useCallback((id: string) => {
    setHidden((h) => new Set([...h, id]));
    setCustom(true);
  }, []);
  // A widget coming back lands at the bottom of the desk, in its own size.
  const add = useCallback(
    (id: string) => {
      setLayouts((prev) => {
        const out: Layouts = {};
        for (const bp of Object.keys(defaultLayouts)) {
          const items = (prev[bp] ?? []).filter((l) => l.i !== id);
          const def = (defaultLayouts[bp] ?? []).find((l) => l.i === id);
          if (!def) {
            out[bp] = items;
            continue;
          }
          const bottom = items
            .filter((l) => !hidden.has(l.i) || l.i === id)
            .reduce((m, l) => Math.max(m, l.y + l.h), 0);
          out[bp] = [...items, { ...def, x: 0, y: bottom }];
        }
        return out;
      });
      setHidden((h) => {
        const n = new Set(h);
        n.delete(id);
        return n;
      });
      setCustom(true);
    },
    [defaultLayouts, hidden],
  );
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setCustom(false);
    setHidden(new Set());
    setLayouts(defaultLayouts);
  }, [defaultLayouts, storageKey]);

  // The grid measures its width a frame after mount and after any change
  // of desk; nudge a window resize so a chart that drew at the first width
  // redraws at the settled one.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      window.dispatchEvent(new Event('resize')),
    );
    return () => cancelAnimationFrame(id);
  }, [layouts, hidden]);

  const byId = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);
  const shownPanels = useMemo(
    () => panels.filter((p) => !hidden.has(p.id)),
    [panels, hidden],
  );
  const putAway = useMemo(
    () => panels.filter((p) => hidden.has(p.id)),
    [panels, hidden],
  );
  // Content-fit widgets measure their whole card, which is never clamped
  // to its slot, and take exactly the rows that needs. One observer watches
  // every such card; a change in its height rewrites that widget's h on
  // every breakpoint.
  const bodies = useRef(new Map<string, HTMLDivElement>());
  const observer = useRef<ResizeObserver | null>(null);
  const fitRows = useCallback((id: string, px: number) => {
    const h = rowsFor(px);
    setLayouts((prev) => {
      let changed = false;
      const out: Layouts = {};
      for (const [bp, items] of Object.entries(prev)) {
        out[bp] = items.map((l) => {
          if (l.i !== id || l.h === h) return l;
          changed = true;
          return { ...l, h };
        });
      }
      return changed ? out : prev;
    });
  }, []);
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.widget;
        if (id) fitRows(id, (e.target as HTMLElement).offsetHeight);
      }
    });
    observer.current = ro;
    for (const el of bodies.current.values()) ro.observe(el);
    return () => ro.disconnect();
  }, [fitRows]);
  // One stable ref callback per widget, so React does not re-attach the
  // ref (and re-measure) on every render.
  const refs = useRef(new Map<string, (el: HTMLDivElement | null) => void>());
  const bodyRef = useCallback(
    (id: string) => {
      let fn = refs.current.get(id);
      if (!fn) {
        fn = (el) => {
          const prev = bodies.current.get(id);
          if (prev && prev !== el) observer.current?.unobserve(prev);
          if (el) {
            bodies.current.set(id, el);
            observer.current?.observe(el);
            // First measure off the commit, not inside it.
            requestAnimationFrame(() => fitRows(id, el.offsetHeight));
          } else bodies.current.delete(id);
        };
        refs.current.set(id, fn);
      }
      return fn;
    },
    [fitRows],
  );

  // Only the shown widgets go to the grid; every one keeps its fixed size.
  const shownLayouts = useMemo<Layouts>(() => {
    const out: Layouts = {};
    for (const [bp, items] of Object.entries(layouts)) {
      out[bp] = items
        .filter((l) => !hidden.has(l.i))
        .map((l) => ({ ...l, static: false, isResizable: false }));
    }
    return out;
  }, [layouts, hidden]);

  return (
    <Box
      sx={{
        // The library's handles, drawn in the site's language: a square
        // corner tab, hairline, blue when it is live.
        // No sliding into place: the library animates item positions and
        // its own height, which reads as a wobble on every arrival.
        '& .react-grid-layout': { transition: 'none' },
        '& .react-grid-item, & .react-grid-item.cssTransforms': {
          transition: 'none',
        },
        // Nothing shows until the widgets have measured their content and
        // taken their heights; one frame later they appear settled.
        visibility: settled ? 'visible' : 'hidden',
        '& .react-grid-item.react-grid-placeholder': {
          backgroundColor: 'primary.main',
          opacity: 0.08,
          borderRadius: 0,
          transition: 'none',
        },
        '& .react-grid-item.react-draggable-dragging': {
          zIndex: 3,
          '& > .workspace-panel': { borderColor: 'primary.main' },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 1,
        }}
      >
        {/* The widgets that are put away, one click from back on the desk. */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28 }}
        >
          {putAway.map((p) => (
            <TextLinkButton
              key={p.id}
              onClick={() => add(p.id)}
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              sx={{ fontSize: '0.65rem', px: 0.75 }}
            >
              {p.title}
            </TextLinkButton>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              display: { xs: 'none', md: 'block' },
            }}
          >
            Drag a widget by its title
          </Typography>
          {custom && (
            <TextLinkButton onClick={reset} sx={{ fontSize: '0.65rem', px: 0 }}>
              Reset desk
            </TextLinkButton>
          )}
          {controls}
        </Box>
      </Box>
      <ResponsiveGrid
        className="workspace"
        layouts={shownLayouts}
        breakpoints={BREAKPOINTS}
        cols={WORKSPACE_COLS}
        rowHeight={ROW_HEIGHT}
        margin={[GUTTER_X, GUTTER_Y]}
        containerPadding={[0, 0]}
        draggableHandle=".workspace-drag"
        compactType="vertical"
        onLayoutChange={onLayoutChange}
        onDragStop={onUserChange}
        isResizable={false}
      >
        {shownPanels.map((p) => (
          <Box key={p.id} sx={{ minWidth: 0, minHeight: 0 }}>
            <Box
              className="workspace-panel"
              ref={p.fit === 'fill' ? undefined : bodyRef(p.id)}
              data-widget={p.fit === 'fill' ? undefined : p.id}
              sx={{
                // A content-fit box ends exactly at its content and is
                // never clamped: its slot is sized from it, rounded to the
                // grid, so the slot may run a few px longer but never
                // shorter. A fill box takes the whole slot.
                height:
                  p.fit === 'fill' ? `calc(100% - ${PANEL_GAP}px)` : 'auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0,
                backgroundColor: 'background.default',
                transition: 'border-color 120ms',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Box
                className="workspace-drag"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  cursor: 'grab',
                  userSelect: 'none',
                  flexShrink: 0,
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'text.primary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                  }}
                >
                  {byId.get(p.id)?.title}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexShrink: 0,
                    cursor: 'default',
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {p.aside}
                  <Box
                    component="button"
                    type="button"
                    aria-label={`Put away ${typeof p.title === 'string' ? p.title : 'widget'}`}
                    onClick={() => remove(p.id)}
                    sx={{
                      all: 'unset',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: 'text.disabled',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </Box>
                </Box>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
                  // A fill body scrolls if its content is taller than the
                  // slot; a content-fit body is never shorter than its
                  // content, so only a wide sheet gets a scrollbar.
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 1.5,
                  '&::-webkit-scrollbar': { width: 4, height: 4 },
                  '&::-webkit-scrollbar-thumb': {
                    background: (t) => t.palette.border.light,
                    borderRadius: 0,
                  },
                }}
              >
                {p.fit === 'fill' ? (
                  p.node
                ) : (
                  // A block the content sets the height of; the card
                  // around it is what the observer reads.
                  <Box sx={{ flex: 'none', minWidth: 0 }}>{p.node}</Box>
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </ResponsiveGrid>
    </Box>
  );
};

export default Workspace;
