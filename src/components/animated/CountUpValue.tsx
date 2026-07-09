import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import RollingValue from './RollingValue';

interface Props {
  value: string;
}

// Odometer reveal: every digit column holds at 0 until the value scrolls into
// view, then rolls to its target with a right-to-left stagger (RollingValue's
// transition does the motion). Later live updates roll digit-to-digit through
// the same mechanism — no separate count-up phase, no layout shift.
const CountUpValue: React.FC<Props> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const shown = visible ? value : value.replace(/[0-9]/g, '0');

  return (
    <Box component="span" ref={ref} sx={{ display: 'inline-block' }}>
      <RollingValue value={shown} />
    </Box>
  );
};

export default CountUpValue;
