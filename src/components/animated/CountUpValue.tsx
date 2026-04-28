import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import RollingValue from './RollingValue';

type Phase = 'idle' | 'animating' | 'done';

interface Props {
  value: string;
  durationMs?: number;
}

const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

const decimalsFromString = (v: string): number => {
  const dot = v.indexOf('.');
  return dot === -1 ? 0 : v.length - dot - 1;
};

const CountUpValue: React.FC<Props> = ({ value, durationMs = 1800 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [display, setDisplay] = useState('0');

  const target = parseFloat(value);
  const finite = Number.isFinite(target);
  const decimals = decimalsFromString(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase((p) => (p === 'idle' ? 'animating' : p));
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== 'animating') return;
    if (!finite) {
      setDisplay(value);
      setPhase('done');
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const current = target * easeOutQuart(t);
      setDisplay(current.toFixed(decimals));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase('done');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, target, durationMs, decimals, finite, value]);

  return (
    <Box component="span" ref={ref} sx={{ display: 'inline-block' }}>
      {phase === 'done' ? (
        <RollingValue value={value} />
      ) : phase === 'animating' ? (
        display
      ) : (
        finite ? (0).toFixed(decimals) : '—'
      )}
    </Box>
  );
};

export default CountUpValue;
