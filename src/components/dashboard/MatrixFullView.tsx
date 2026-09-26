import React from 'react';
import { Box, Dialog, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { FONTS } from '../../theme';

// The whole market at once: the Matrix widget's sheet over the full screen,
// every row shown and the header and anchor column pinned while it scrolls.
// Picking a number closes it, so the pick lands on the desk behind.

export const ExpandButton: React.FC<{ onClick: () => void }> = ({
  onClick,
}) => (
  <Box
    component="button"
    type="button"
    aria-label="Show every pair"
    title="Show every pair"
    onClick={onClick}
    sx={{
      all: 'unset',
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'pointer',
      color: 'text.disabled',
      '&:hover': { color: 'primary.main' },
    }}
  >
    <OpenInFullIcon sx={{ fontSize: 13 }} />
  </Box>
);

const MatrixFullView: React.FC<{
  open: boolean;
  onClose: () => void;
  assets: number;
  directions: number;
  children: React.ReactNode;
}> = ({ open, onClose, assets, directions, children }) => (
  <Dialog
    fullScreen
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        backgroundColor: 'background.default',
        backgroundImage: 'none',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
      },
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        px: { xs: 2, md: 3 },
        pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'border.light',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2.5 }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Every market
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          {assets.toLocaleString()} assets ·{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {directions.toLocaleString()}
          </Box>{' '}
          directions
        </Typography>
      </Box>
      <Box
        component="button"
        type="button"
        aria-label="Close"
        onClick={onClose}
        sx={{
          all: 'unset',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          cursor: 'pointer',
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          '&:hover': { color: 'primary.main' },
        }}
      >
        Esc
        <CloseIcon sx={{ fontSize: 16 }} />
      </Box>
    </Box>
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        px: { xs: 0, md: 3 },
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {children}
    </Box>
  </Dialog>
);

export default MatrixFullView;
