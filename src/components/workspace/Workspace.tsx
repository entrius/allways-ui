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
  /**
   * 'content' (default): the widget's height follows what is inside it,
   * so a sheet with rows hidden or a book with two levels takes only the
   * rows it needs. 'fill': the content stretches to the widget's height
   * from the layout (a chart).
   */
  fit?: 'content' | 'fill';
  /** 'full': the widget spans every column of the desk (a wide sheet). */
  span?: 'column' | 'full';
  /** The widget's content width in px: it takes as many desk columns as
   * that needs, up to the whole desk (a sheet sized by its columns). */
  widthPx?: number;
  /** A set number of desk columns (the widget's own width setting); wins
   * over widthPx, and a narrower desk caps it. */
  columns?: number;
  /** The tallest the desk may stretch it, in 8px rows. A list can take
   * any height; a chart past a point is just a stretched line. */
  maxRows?: number;
  /** The most rows the desk may add below its own height: a content card
   * stretched far past its content is a big blank box. */
  maxStretch?: number;
  /** Another widget's id: while that one sits beside this one on the same
   * row, this one takes its height exactly (a chart beside the rate card
   * it charts), so the pair reads as one row and neither stretches. */
  heightOf?: string;
  /** The body has no padding: a sheet that scrolls runs to the card's
   * edges, its scrollbars on the border. */
  flush?: boolean;
};

// The grid's units. Three columns on a wide screen, two on a medium one,
// one on a narrow one, with the landing card gap between them: every
// widget is exactly one column wide (or, when it asks, the whole desk), so
// a drag can only land it in a column and the desk is always tidy stacks. Rows are fine, 8px each (4px row + 4px gap), so a
// widget's box can end within a few pixels of its content; the visible gap
// between widgets is made up to the landing 24px by leaving each box 20px
// short of its slot.
export const WORKSPACE_COLS = { lg: 3, md: 2, sm: 1, xs: 1 } as const;
const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 };
const ROW_HEIGHT = 4;
const GUTTER_Y = 4;
const ROW_UNIT = ROW_HEIGHT + GUTTER_Y;
// No gaps: widgets touch like a terminal's panes, across and down, and
// each shared edge is drawn once. A card reaches 1px left over its
// neighbour's right border, and down through the 4px row gap and 1px over
// the next card's top border.
const GUTTER_X = 0;
const OVERLAP = 1;
// A card's border, around the contents the observer measures.
const BORDER_PX = 2;
// Rows for a widget whose contents (title row, body and its padding) are
// this tall. The grid gives a slot of h rows minus one row gap, and the
// card reaches through that gap, so the slot can be a row gap shorter than
// the card; round up to the next 8px row so nothing inside has to scroll.
const rowsFor = (contentPx: number) =>
  Math.max(1, Math.ceil((contentPx + BORDER_PX) / ROW_UNIT));

// Slide every widget up to the highest free spot in its own columns,
// in order from the top, the way the grid itself compacts.
const compact = (items: Layout[]): Layout[] => {
  const out: Layout[] = [];
  for (const l of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let y = 0;
    while (
      out.some(
        (o) =>
          l.x < o.x + o.w && o.x < l.x + l.w && y < o.y + o.h && o.y < y + l.h,
      )
    )
      y += 1;
    out.push({ ...l, y });
  }
  return out;
};

/** The page's own arrangement for one breakpoint, given how many columns
 * each widget spans right now (its width setting, or its content). */
export type Arrange = (
  bp: string,
  cols: number,
  span: (id: string) => number,
  shown: (id: string) => boolean,
) => Layout[];

const NO_IDS: string[] = [];

// What a browser remembers: where each widget sits, which are put away, and
// whether a person placed them by hand (else the page arranges them).
type Saved = { layouts: Layouts; hidden: string[]; placed?: boolean };

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
    return {
      layouts: parsed.layouts,
      hidden: parsed.hidden ?? [],
      placed: parsed.placed ?? true,
    };
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
  /** Called with the desk's reset, to put page state (the window) back. */
  onReset?: () => void;
  /** Desk-wide one-tap controls (the lookback) for the bar. */
  controls?: React.ReactNode;
  /** The page's arrangement for the widgets' current widths. Until a
   * person drags a widget, the desk follows it, so changing a widget's
   * width re-lays the desk out instead of leaving a hole. */
  arrange?: Arrange;
  /** Changes whenever a widget's width setting does. A new width re-lays
   * the desk out from the page's arrangement, so a person's old
   * arrangement never clashes with the new widths. */
  layoutKey?: string;
  /** Page state that differs from its defaults (the window, a widget's
   * settings): the desk offers its reset for that too. */
  dirty?: boolean;
  /** Widgets that start put away: the page opens simple and a person adds
   * the advanced ones from the bar. */
  defaultHidden?: string[];
}> = ({
  panels,
  defaultLayouts,
  storageKey,
  onReset,
  controls,
  arrange,
  layoutKey,
  dirty = false,
  defaultHidden = NO_IDS,
}) => {
  const [layouts, setLayouts] = useState<Layouts>(() => {
    const stored = readSaved(storageKey);
    return stored ? reconcile(stored.layouts, defaultLayouts) : defaultLayouts;
  });
  const [hidden, setHidden] = useState<Set<string>>(() => {
    const stored = readSaved(storageKey);
    const ids = new Set(panels.map((p) => p.id));
    return new Set(
      (stored?.hidden ?? defaultHidden).filter((id) => ids.has(id)),
    );
  });
  const [custom, setCustom] = useState(
    () => readSaved(storageKey)?.placed ?? false,
  );
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

  // Put-away widgets that differ from the page's opening set.
  const hiddenMoved =
    hidden.size !== defaultHidden.length ||
    defaultHidden.some((id) => !hidden.has(id));
  useEffect(() => {
    if (custom || hiddenMoved)
      writeSaved(storageKey, {
        layouts,
        hidden: [...hidden],
        placed: custom,
      });
  }, [custom, hiddenMoved, layouts, hidden, storageKey]);

  // The grid reports only the widgets it shows; keep the put-away ones'
  // last positions so they come back where they were.
  // Positions and widths come back from the grid; a widget's height is its own
  // (its content, or the page's default), never the stretched height the
  // grid was handed, or a stretch would ratchet and never let go.
  const onLayoutChange = useCallback((_: Layout[], all: Layouts) => {
    setLayouts((prev) => {
      const out: Layouts = {};
      for (const bp of new Set([...Object.keys(prev), ...Object.keys(all)])) {
        const before = new Map((prev[bp] ?? []).map((l) => [l.i, l]));
        const shown = (all[bp] ?? []).map((l) => {
          const b = before.get(l.i);
          return b ? { ...l, h: b.h } : l;
        });
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
    setHidden(new Set(defaultHidden));
    setLayouts(defaultLayouts);
    onReset?.();
  }, [defaultLayouts, storageKey, onReset, defaultHidden]);

  // A width change drops a hand-made arrangement (not the put-away
  // widgets): the page's arrangement for the new widths takes over.
  const lastKey = useRef(layoutKey);
  useEffect(() => {
    if (lastKey.current === layoutKey) return;
    lastKey.current = layoutKey;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setCustom(false);
    setLayouts(defaultLayouts);
  }, [layoutKey, storageKey, defaultLayouts]);

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
  // Size every content-fit widget's slot from its card as it is now.
  const remeasure = useCallback(() => {
    for (const [id, el] of bodies.current)
      if (el.isConnected) fitRows(id, el.offsetHeight);
  }, [fitRows]);

  // The grid measures its width a frame after mount and after any change
  // of desk; nudge a window resize so a chart that drew at the first width
  // redraws at the settled one, then re-measure every content-fit card so
  // no slot is left taller than its card. The observer below catches
  // content changes as they happen; this pass is the backstop for any it
  // missed (a hot reload, a tab that was hidden while the data moved).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      remeasure();
    });
    return () => cancelAnimationFrame(id);
    // remeasure is stable; the pass is keyed to the desk changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layouts, hidden]);
  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'visible') remeasure();
    };
    window.addEventListener('resize', onChange);
    document.addEventListener('visibilitychange', onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener('resize', onChange);
      document.removeEventListener('visibilitychange', onChange);
      window.removeEventListener('focus', onChange);
    };
  }, [remeasure]);
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

  // The desk's width as the grid measures it, to turn a widget's content
  // width into whole columns.
  const [deskPx, setDeskPx] = useState(0);
  const spanFor = useCallback(
    (p: WorkspacePanel | undefined, cols: number) => {
      if (p?.span === 'full') return cols;
      if (p?.columns) return Math.max(1, Math.min(cols, p.columns));
      if (!p?.widthPx || !deskPx) return 1;
      const colPx = (deskPx - GUTTER_X * (cols - 1)) / cols;
      const need = Math.ceil(
        (p.widthPx + BORDER_PX + GUTTER_X) / (colPx + GUTTER_X),
      );
      return Math.max(1, Math.min(cols, need));
    },
    [deskPx],
  );

  // Only the shown widgets go to the grid. Each is one column wide, the
  // whole desk, or as many columns as its content needs. Sizes are the
  // page's: nothing is resized by hand.
  //
  // Then the desk is squared off: the last widget in every column runs
  // down to the lowest bottom on the desk, so stacks of different heights
  // still end on one line, with no hole under the shorter ones. A fill
  // widget (a chart, a list) uses the room; a content widget keeps its
  // content at the top of a taller card.
  const shownLayouts = useMemo<Layouts>(() => {
    const out: Layouts = {};
    for (const [bp, items] of Object.entries(layouts)) {
      const cols = WORKSPACE_COLS[bp as keyof typeof WORKSPACE_COLS] ?? 1;
      let placed: Layout[] = items
        .filter((l) => !hidden.has(l.i))
        .map((l) => {
          const p = byId.get(l.i);
          // A widget with no width of its own keeps the width the desk gave
          // it (the page's arrangement can make the history two wide).
          const w =
            p?.span || p?.columns || p?.widthPx
              ? spanFor(p, cols)
              : Math.max(1, Math.min(cols, l.w));
          return {
            ...l,
            w,
            x: Math.min(l.x, cols - w),
            static: false,
            isResizable: false,
          };
        });
      const overlaps = (a: Layout, b: Layout) =>
        a.x < b.x + b.w && b.x < a.x + a.w;
      // Until a person arranges the desk, it is the page's: where each
      // widget sits and how wide comes from the page's arrangement for the
      // current widths; heights stay the widgets' own.
      if (!custom && arrange) {
        const h = new Map(placed.map((l) => [l.i, l.h]));
        placed = compact(
          arrange(
            bp,
            cols,
            (id) => spanFor(byId.get(id), cols),
            (id) => !hidden.has(id),
          )
            .filter((l) => h.has(l.i))
            .map((l) => ({
              ...l,
              w: Math.min(l.w, cols),
              x: Math.min(l.x, cols - Math.min(l.w, cols)),
              h: h.get(l.i) ?? l.h,
              static: false,
              isResizable: false,
            })),
        );
      }
      // A widget paired to one beside it on its row takes that one's
      // height; the desk then packs up under the pair.
      let paired = false;
      placed = placed.map((l) => {
        const of = byId.get(l.i)?.heightOf;
        const t = of ? placed.find((o) => o.i === of) : undefined;
        if (!t || t.y !== l.y || overlaps(t, l) || t.h === l.h) return l;
        paired = true;
        return { ...l, h: t.h };
      });
      if (paired) placed = compact(placed);
      const pairedIds = new Set(
        placed
          .filter((l) => {
            const of = byId.get(l.i)?.heightOf;
            const t = of ? placed.find((o) => o.i === of) : undefined;
            return t && t.y === l.y && !overlaps(t, l);
          })
          .flatMap((l) => [l.i, byId.get(l.i)?.heightOf ?? '']),
      );
      // Every widget runs down to the next one below it, or to the desk's
      // bottom, so no stack leaves a hole. A paired row keeps its height.
      const floor = placed.reduce((m, l) => Math.max(m, l.y + l.h), 0);
      out[bp] = placed.map((l) => {
        const next = placed
          .filter((o) => o !== l && o.y >= l.y + l.h && overlaps(o, l))
          .reduce((m, o) => Math.min(m, o.y), floor);
        const p = byId.get(l.i);
        if (pairedIds.has(l.i)) return l;
        const cap = Math.min(
          p?.maxRows ?? Infinity,
          l.h + (p?.maxStretch ?? Infinity),
        );
        return { ...l, h: Math.max(l.h, Math.min(cap, next - l.y)) };
      });
    }
    return out;
  }, [layouts, hidden, byId, spanFor, custom, arrange]);

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
        '& .react-grid-item:hover': { zIndex: 2 },
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
          {(custom || dirty || hiddenMoved) && (
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
        onWidthChange={(px) => setDeskPx(px)}
        isResizable={false}
      >
        {shownPanels.map((p) => (
          <Box key={p.id} sx={{ minWidth: 0, minHeight: 0 }}>
            <Box
              className="workspace-panel"
              sx={{
                // Every card takes its slot, the row gap after it and the
                // next card's top border; and 1px of its left neighbour's
                // right border. Shared edges draw once, one weight.
                height: `calc(100% + ${GUTTER_Y + OVERLAP}px)`,
                width: `calc(100% + ${OVERLAP}px)`,
                ml: `-${OVERLAP}px`,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                border: '1px solid',
                borderColor: 'border.medium',
                borderRadius: 0,
                backgroundColor: 'background.default',
                transition: 'border-color 120ms',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Box
                className="workspace-card"
                ref={p.fit === 'fill' ? undefined : bodyRef(p.id)}
                data-widget={p.fit === 'fill' ? undefined : p.id}
                sx={{
                  // The contents: what the observer measures. A fill
                  // widget's contents stretch to the card.
                  display: 'flex',
                  flexDirection: 'column',
                  flex: p.fit === 'fill' ? 1 : 'none',
                  minHeight: 0,
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
                    p: p.flush ? 0 : 1.5,
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
          </Box>
        ))}
      </ResponsiveGrid>
    </Box>
  );
};

export default Workspace;
