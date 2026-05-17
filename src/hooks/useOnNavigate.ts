import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Fires `callback` only when the route pathname changes — not when search
// params or hash change. The callback is held in a ref so its identity
// doesn't pull the effect into firing on every parent re-render (which
// happens whenever location.search updates).
export const useOnNavigate = (callback: () => void) => {
  const { pathname } = useLocation();
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    cbRef.current();
  }, [pathname]);
};

export default useOnNavigate;
