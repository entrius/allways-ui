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

const readLayouts = (key: string): Layouts | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Layouts;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};
const writeLayouts = (key: string, layouts: Layouts) => {
  try {
    localStorage.setItem(key, JSON.stringify(layouts));
  } catch {
    // Storage may be unavailable (private mode); the layout is still live
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
 * A Bloomberg-style workspace: every piece of the page is a panel a person
 * can drag by its title and resize from its corner, and the arrangement is
 * remembered per browser. Panels wear the landing card: a square hairline,
 * a mono title, blue on hover. Reset returns the page's own arrangement.
 */
const Workspace: React.FC<{
  panels: WorkspacePanel[];
  /** The page's own arrangement, per breakpoint. */
  defaultLayouts: Layouts;
  /** localStorage key; bump its version suffix when the defaults change. */
  storageKey: string;
}> = ({ panels, defaultLayouts, storageKey }) => {
  const [layouts, setLayouts] = useState<Layouts>(() => {
    const stored = readLayouts(storageKey);
    return stored ? reconcile(stored, defaultLayouts) : defaultLayouts;
  });
  const [custom, setCustom] = useState(() => readLayouts(storageKey) != null);

  useEffect(() => {
    if (custom) writeLayouts(storageKey, layouts);
  }, [custom, layouts, storageKey]);

  const onLayoutChange = useCallback((_: Layout[], all: Layouts) => {
    setLayouts(all);
  }, []);
  const onUserChange = useCallback(() => setCustom(true), []);
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setCustom(false);
    setLayouts(defaultLayouts);
  }, [defaultLayouts, storageKey]);

  const byId = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);
  // Each panel's floor size rides on its layout entries, per breakpoint,
  // so the grid never lets a panel shrink below what its content needs.
  const bounded = useMemo<Layouts>(() => {
    const out: Layouts = {};
    for (const [bp, items] of Object.entries(layouts)) {
      out[bp] = items.map((l) => {
        const p = byId.get(l.i);
        return { ...l, minW: p?.minW ?? 2, minH: p?.minH ?? 4 };
      });
    }
    return out;
  }, [layouts, byId]);

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
        '& .react-grid-item > .react-resizable-handle': {
          width: 14,
          height: 14,
          right: 0,
          bottom: 0,
          padding: 0,
          backgroundImage: 'none',
          cursor: 'nwse-resize',
          '&::after': {
            content: '""',
            position: 'absolute',
            right: 3,
            bottom: 3,
            width: 8,
            height: 8,
            borderRight: '2px solid',
            borderBottom: '2px solid',
            borderColor: 'divider',
          },
        },
        '& .react-grid-item:hover > .react-resizable-handle::after': {
          borderColor: 'primary.main',
        },
        '& .react-grid-item.resizing, & .react-grid-item.react-draggable-dragging':
          {
            zIndex: 3,
            '& > .workspace-panel': { borderColor: 'primary.main' },
          },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 2,
          mb: 1,
        }}
      >
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
          Drag a panel by its title · resize from its corner
        </Typography>
        {custom && (
          <TextLinkButton onClick={reset} sx={{ fontSize: '0.65rem', px: 0 }}>
            Reset layout
          </TextLinkButton>
        )}
      </Box>
      <ResponsiveGrid
        className="workspace"
        layouts={bounded}
        breakpoints={BREAKPOINTS}
        cols={WORKSPACE_COLS}
        rowHeight={ROW_HEIGHT}
        margin={[GUTTER, GUTTER]}
        containerPadding={[0, 0]}
        draggableHandle=".workspace-drag"
        compactType="vertical"
        onLayoutChange={onLayoutChange}
        onDragStop={onUserChange}
        onResizeStop={onUserChange}
        resizeHandles={['se']}
      >
        {panels.map((p) => (
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
                {p.aside && (
                  <Box
                    sx={{ flexShrink: 0, cursor: 'default' }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {p.aside}
                  </Box>
                )}
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
