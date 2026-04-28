import { useCallback, useRef, useState } from 'react';

export interface UseCopyResult {
  copied: boolean;
  copy: (value: string) => void;
}

export const useCopy = (resetMs = 1500): UseCopyResult => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    (value: string) => {
      void navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs],
  );

  return { copied, copy };
};
