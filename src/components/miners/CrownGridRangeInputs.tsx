import React, { useEffect, useMemo, useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { FONTS } from '../../theme';

// From/to block-number inputs for the crown grid's custom-range mode.
// Owns its own draft state (resets when the URL-driven props change), and
// commits via onChange on Enter when valid. Validation: both ends set,
// non-negative integers, to > from, span <= maxSpan.
const CrownGridRangeInputs: React.FC<{
  customFrom: number | null;
  customTo: number | null;
  customActive: boolean;
  maxSpan: number;
  onChange: (from: number | null, to: number | null) => void;
}> = ({ customFrom, customTo, customActive, maxSpan, onChange }) => {
  const [fromInput, setFromInput] = useState(
    customFrom != null ? String(customFrom) : '',
  );
  const [toInput, setToInput] = useState(
    customTo != null ? String(customTo) : '',
  );
  useEffect(() => {
    setFromInput(customFrom != null ? String(customFrom) : '');
  }, [customFrom]);
  useEffect(() => {
    setToInput(customTo != null ? String(customTo) : '');
  }, [customTo]);

  const error = useMemo(() => {
    if (!fromInput && !toInput) return null;
    if (!fromInput || !toInput) return 'set both ends';
    const f = Number(fromInput);
    const t = Number(toInput);
    if (!Number.isInteger(f) || !Number.isInteger(t) || f < 0 || t < 0)
      return 'block #s must be non-negative integers';
    if (t <= f) return 'to must be > from';
    if (t - f > maxSpan) return `range > ${maxSpan} blocks`;
    return null;
  }, [fromInput, toInput, maxSpan]);

  const submit = () => {
    if (error || !fromInput || !toInput) return;
    onChange(Number(fromInput), Number(toInput));
  };
  const clear = () => {
    setFromInput('');
    setToInput('');
    onChange(null, null);
  };

  const onlyDigits = (raw: string) => raw.replace(/[^0-9]/g, '');
  const inputProps = {
    style: {
      fontFamily: FONTS.mono,
      fontSize: '0.7rem',
      padding: '5px 9px',
    },
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <Typography
        variant="mono"
        sx={{
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'text.disabled',
          mr: 0.5,
        }}
      >
        range
      </Typography>
      <TextField
        size="small"
        placeholder="from #"
        value={fromInput}
        onChange={(e) => setFromInput(onlyDigits(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        inputProps={inputProps}
        sx={{ width: 110 }}
      />
      <Typography
        variant="mono"
        sx={{ fontSize: '0.7rem', color: 'text.disabled' }}
      >
        →
      </Typography>
      <TextField
        size="small"
        placeholder="to #"
        value={toInput}
        onChange={(e) => setToInput(onlyDigits(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        inputProps={inputProps}
        sx={{ width: 110 }}
      />
      {customActive && (
        <Button
          variant="text"
          size="small"
          onClick={clear}
          sx={{ fontFamily: FONTS.mono, fontSize: '0.65rem' }}
        >
          × clear range
        </Button>
      )}
      {error ? (
        <Typography
          variant="mono"
          sx={{ fontSize: '0.6rem', color: 'error.main' }}
        >
          {error}
        </Typography>
      ) : (
        (fromInput || toInput) &&
        !customActive && (
          <Typography
            variant="mono"
            sx={{ fontSize: '0.6rem', color: 'text.disabled' }}
          >
            press enter to apply
          </Typography>
        )
      )}
    </Stack>
  );
};

export default CrownGridRangeInputs;
