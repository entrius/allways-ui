import React, { useState } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { assetLabel } from '../../api/models/chains';
import { FONTS } from '../../theme';
import SearchField from '../SearchField';

// Case-insensitive match on either leg's id or label ("sn19", "bnb").
export const pairMatches = (a: string, b: string, query: string): boolean =>
  [a, b, assetLabel(a), assetLabel(b)].some((s) =>
    s.toLowerCase().includes(query),
  );

// Alpha rows behind one "<label> (N)" toggle with a text filter, so a full-quote miner never renders thousands of rows.
const AlphaPairsFold = <T,>({
  rows,
  matches,
  label = 'Alpha pairs',
  sx,
  children,
}: {
  rows: T[];
  matches: (row: T, query: string) => boolean;
  label?: string;
  sx?: SxProps<Theme>;
  children: (visible: T[]) => React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  if (rows.length === 0) return null;
  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => matches(r, q)) : rows;
  return (
    <Box sx={sx}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        sx={{
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
        }}
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
        {label} ({rows.length})
      </Box>
      {open && (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="filter · sn19, bnb"
            sx={{ maxWidth: 260, my: 0.7 }}
          />
          {children(visible)}
        </>
      )}
    </Box>
  );
};

export default AlphaPairsFold;
