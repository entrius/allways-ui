import React from 'react';
import { Button, type ButtonProps } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { FONTS } from '../theme';

// The hero's two buttons, as the site's only two. Anything that can be
// pressed on an app page is one of these (or a RangeChips toggle / a
// MonoSelect), so a button on the miner page is the button on the home page.

const labelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.8rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  borderRadius: 0,
  boxShadow: 'none',
} as const;

/** Filled brand blue, square, no shadow, no hover darkening. One per view. */
export const PrimaryButton: React.FC<ButtonProps & { to?: string }> = ({
  sx,
  ...props
}) => (
  <Button
    variant="contained"
    size="large"
    disableElevation
    sx={{
      ...labelSx,
      px: 4,
      py: 1.5,
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-white)',
      '&:hover': {
        backgroundColor: 'var(--color-primary)',
        boxShadow: 'none',
      },
      ...sx,
    }}
    {...props}
  />
);

/** Mono text, secondary ink, blue on hover; a trailing arrow when it leads
 * somewhere. */
export const TextLinkButton: React.FC<
  ButtonProps & { to?: string; arrow?: boolean }
> = ({ sx, arrow, endIcon, ...props }) => (
  <Button
    endIcon={arrow ? <ArrowForwardIcon sx={{ fontSize: 16 }} /> : endIcon}
    sx={{
      ...labelSx,
      color: 'text.secondary',
      px: 1,
      '&:hover': { color: 'primary.main', backgroundColor: 'transparent' },
      ...sx,
    }}
    {...props}
  />
);
