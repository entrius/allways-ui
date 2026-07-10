import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// A single odometer column: a vertical strip of 0-9 that rolls to the target
// digit. Rolls in from 0 on mount, and transitions digit-to-digit on later
// changes — one mechanism for both the reveal and live updates. `delayMs`
// staggers columns so a multi-digit change sweeps right-to-left like a
// mechanical counter.
const OdometerDigit: React.FC<{ digit: string; delayMs: number }> = ({
  digit,
  delayMs,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Two frames so the strip paints at 0 before rolling to the target.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMounted(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  const target = mounted ? Number(digit) : 0;

  return (
    <Box
      sx={{
        display: 'inline-block',
        position: 'relative',
        width: '0.85em',
        height: '1em',
        overflow: 'hidden',
        verticalAlign: 'baseline',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          transform: `translateY(-${target}em)`,
          transition: `transform 1100ms cubic-bezier(0.23, 1, 0.32, 1) ${delayMs}ms`,
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
        }}
      >
        {DIGITS.map((d) => (
          <Box
            key={d}
            sx={{
              height: '1em',
              lineHeight: 1,
              display: 'flex',
              // Bottom-aligned, not centered: an overflow-hidden inline-block
              // puts its baseline at the box's bottom edge, so the glyph's
              // baseline must sit there too or neighbouring text (the "SOL"
              // unit) renders visibly lower than the digits.
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            {d}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/** Non-digit characters (".", ",", "%") render static at a narrow width. */
export const RollingChar: React.FC<{ char: string; delayMs?: number }> = ({
  char,
  delayMs = 0,
}) =>
  /[0-9]/.test(char) ? (
    <OdometerDigit digit={char} delayMs={delayMs} />
  ) : (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: char === '.' || char === ',' ? '0.4em' : 'auto',
        textAlign: 'center',
      }}
    >
      {char}
    </Box>
  );

const STAGGER_MS = 55;

const RollingValue: React.FC<{ value: string }> = ({ value }) => {
  const chars = value.split('');
  // Key by position from the right so when the value gains/loses a digit
  // (e.g. 99 -> 100), the digits that already existed keep their identity
  // and only the new leading digit mounts. Right-anchored keys mean the
  // ones place stays the ones place across length changes; the stagger also
  // runs from the right, like a mechanical counter.
  return (
    <Box sx={{ display: 'inline-flex', justifyContent: 'center' }}>
      {chars.map((c, i) => {
        const fromRight = chars.length - 1 - i;
        return (
          <RollingChar
            key={`r${fromRight}`}
            char={c}
            delayMs={fromRight * STAGGER_MS}
          />
        );
      })}
    </Box>
  );
};

export default RollingValue;
