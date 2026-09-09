import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
};

// The grid's units. Twelve columns on a wide screen, a row is 24px, and the
// gutter is the landing card gap (24px), so panels sit the way landing cards
// do.
export const WORKSPACE_COLS = { lg: 12, md: 12, sm: 6, xs: 2 } as const;
const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 };
const ROW_HEIGHT = 24;
const GUTTER = 24;

// What a browser remembers: where each widget sits, and which are put away.
type Saved = { layouts: Layouts; hidden: string[] };

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
}> = ({ panels, defaultLayouts, storageKey }) => {
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
      return out;
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

  const byId = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);
  const shownPanels = useMemo(
    () => panels.filter((p) => !hidden.has(p.id)),
    [panels, hidden],
  );
  const putAway = useMemo(
    () => panels.filter((p) => hidden.has(p.id)),
    [panels, hidden],
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
        '& .react-grid-item': { transition: 'none' },
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
        </Box>
      </Box>
      <ResponsiveGrid
        className="workspace"
        layouts={shownLayouts}
        breakpoints={BREAKPOINTS}
        cols={WORKSPACE_COLS}
        rowHeight={ROW_HEIGHT}
        margin={[GUTTER, GUTTER]}
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
              sx={{
                height: '100%',
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
                {p.node}
              </Box>
            </Box>
          </Box>
        ))}
      </ResponsiveGrid>
    </Box>
  );
};

export default Workspace;
