import React from 'react';
import { Box, Collapse, Typography } from '@mui/material';
import { FONTS } from '../../theme';

/**
 * One collapsible section of the network page. The header is the whole
 * clickable row — a terminal-style disclosure marker, the section name, and
 * a line saying what is inside, so a collapsed section still tells the
 * reader what opening it gets them.
 *
 * Children mount on open and unmount on close, so a collapsed section costs
 * no queries: the page loads the tape only until someone asks for the rest.
 */
const SectionAccordion: React.FC<{
  id: string;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  /** Fires once the section has finished opening and its content is laid
   * out — the only moment an anchor can be scrolled to accurately. */
  onEntered?: () => void;
  /** Scroll offset so an anchored section stops below the pinned ribbon. */
  scrollMarginTop: number;
  first?: boolean;
  children: React.ReactNode;
}> = ({
  id,
  title,
  subtitle,
  open,
  onToggle,
  onEntered,
  scrollMarginTop,
  first,
  children,
}) => (
  <Box
    component="section"
    id={id}
    sx={{
      scrollMarginTop: `${scrollMarginTop}px`,
      borderTop: first ? 0 : '1px solid',
      borderColor: 'divider',
    }}
  >
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`${id}-body`}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 0,
        borderRadius: 0,
        p: 0,
        pt: first ? { xs: 1.5, md: 2 } : { xs: 2.5, md: 3 },
        pb: open ? { xs: 1.5, md: 2 } : { xs: 2.5, md: 3 },
        cursor: 'pointer',
        color: 'inherit',
        '&:hover .section-title, &:focus-visible .section-title': {
          color: 'primary.main',
        },
        '&:hover .section-marker, &:focus-visible .section-marker': {
          color: 'primary.main',
        },
      }}
    >
      <Typography
        className="section-marker"
        aria-hidden
        sx={{
          fontFamily: FONTS.mono,
          fontSize: { xs: '0.8rem', md: '0.9rem' },
          lineHeight: 1.4,
          color: 'text.secondary',
          transform: open ? 'rotate(90deg)' : 'none',
          transformOrigin: '45% 55%',
          transition: 'transform 160ms, color 120ms',
        }}
      >
        ▸
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          className="section-title"
          id={`${id}-heading`}
          sx={{
            fontFamily: FONTS.mono,
            fontSize: { xs: '0.8rem', md: '0.9rem' },
            fontWeight: 700,
            lineHeight: 1.4,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.primary',
            transition: 'color 120ms',
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.68rem',
            color: 'text.secondary',
            mt: 0.5,
            maxWidth: 720,
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
    {/* The region wrapper is always in the DOM so the header's
        aria-controls resolves while the section is folded; only the
        contents come and go. */}
    <Box id={`${id}-body`} role="region" aria-labelledby={`${id}-heading`}>
      <Collapse
        in={open}
        unmountOnExit
        onEntered={onEntered}
        sx={{ pb: open ? { xs: 3, md: 4 } : 0 }}
      >
        {children}
      </Collapse>
    </Box>
  </Box>
);

export default SectionAccordion;
