import React, { useState } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { assetLabel, isAlpha } from '../../api/models/chains';
import { FONTS } from '../../theme';
import SearchField from '../SearchField';

export const hasAlphaLeg = (a: string, b: string): boolean =>
  isAlpha(a) || isAlpha(b);

// Case-insensitive match on either leg's id or label ("sn19", "bnb").
export const pairMatches = (a: string, b: string, query: string): boolean =>
  [a, b, assetLabel(a), assetLabel(b)].some((s) =>
    s.toLowerCase().includes(query),
  );

/**
 * The alpha rows of a per-pair list, folded behind "Alpha pairs (N)" with a
 * text filter. Hub pairs stay inline; the alpha pairs (every subnet × every
 * spoke) would otherwise render thousands of rows for a full-quote miner.
 * Renders a fragment so the header and filter can sit inside the caller's
 * grid — `sx` is for that placement (a column span).
 */
const AlphaPairsFold = <T,>({
  rows,
  matches,
  sx,
  children,
}: {
  rows: T[];
  matches: (row: T, query: string) => boolean;
  sx?: SxProps<Theme>;
  children: (visible: T[]) => React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  if (rows.length === 0) return null;
  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => matches(r, q)) : rows;
  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        sx={[
          {
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            background: 'none',
            border: 0,
            p: 0,
            py: 0.7,
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            letterSpacing: '0.04em',
            color: 'text.secondary',
            '&:hover, &:focus-visible': { color: 'primary.main' },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <Box
          component="span"
          aria-hidden
          sx={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 160ms',
          }}
        >
          ▸
        </Box>
        Alpha pairs ({rows.length})
      </Box>
      {open && (
        <Box sx={[{ py: 0.7 }, ...(Array.isArray(sx) ? sx : [sx])]}>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="filter alpha pairs · sn19, bnb"
            sx={{ maxWidth: 260 }}
          />
        </Box>
      )}
      {open && children(visible)}
    </>
  );
};

export default AlphaPairsFold;
