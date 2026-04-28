import React, { useEffect, useRef, useState } from 'react';
import { Box, keyframes } from '@mui/material';

const slideOut = keyframes`
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(-100%); opacity: 0; }
`;

const slideIn = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
`;

export const RollingChar: React.FC<{ char: string }> = ({ char }) => {
  const [display, setDisplay] = useState(char);
  const [animating, setAnimating] = useState(false);
  const prevRef = useRef(char);
  const prevDisplay = useRef(char);

  useEffect(() => {
    if (char !== prevRef.current) {
      prevDisplay.current = prevRef.current;
      prevRef.current = char;
      setAnimating(true);
      const t = setTimeout(() => {
        setDisplay(char);
        setAnimating(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [char]);

  return (
    <Box
      sx={{
        display: 'inline-block',
        position: 'relative',
        width: /[0-9]/.test(char) ? '0.85em' : char === '.' ? '0.4em' : '0.5em',
        height: '1.2em',
        overflow: 'hidden',
        verticalAlign: 'bottom',
      }}
    >
      {animating && (
        <Box
          key={`out-${prevDisplay.current}`}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `${slideOut} 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          }}
        >
          {prevDisplay.current}
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(animating
            ? {
                animation: `${slideIn} 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              }
            : {}),
        }}
      >
        {display}
      </Box>
    </Box>
  );
};

const RollingValue: React.FC<{ value: string }> = ({ value }) => {
  const chars = value.split('');
  return (
    <Box sx={{ display: 'inline-flex', justifyContent: 'center' }}>
      {chars.map((c, i) => (
        <RollingChar key={`${chars.length}-${i}`} char={c} />
      ))}
    </Box>
  );
};

export default RollingValue;
