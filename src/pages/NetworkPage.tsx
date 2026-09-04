import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Page, SEO } from '../components';
import {
  KPI_STRIP_H,
  NetworkKpiStrip,
  SectionAccordion,
} from '../components/network';
import TransactionsSection from '../components/network/TransactionsSection';

// The folded section loads its code the first time it is opened — a
// visitor who only reads the tape never downloads the leaderboard. Imported
// by path, not through the barrel, so nothing pulls it back into this chunk.
const MinersSection = React.lazy(
  () => import('../components/network/MinersSection'),
);

const SECTIONS = [
  {
    id: 'transactions',
    title: 'Transactions',
    subtitle:
      'Every cross-chain transaction in order, live. Click a row for its full timeline.',
  },
  {
    id: 'miners',
    title: 'Miners',
    subtitle:
      'Who is serving the network: crown share, success rate, collateral and volume per node.',
  },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const isSectionId = (v: string): v is SectionId =>
  SECTIONS.some((s) => s.id === v);

// The tape is what the page is for; miners start folded away under their
// heading, one click from open.
const DEFAULT_OPEN: SectionId[] = ['transactions'];

// Which sections are open is URL state (`?open=miners`), not
// component state: browser-back from a transaction or a miner returns the
// page as it was left, and a link can address a particular arrangement.
// Absent means the default; present-but-empty means everything folded.
const OPEN_PARAM = 'open';

const parseOpen = (value: string | null): Set<SectionId> =>
  new Set(
    value == null
      ? DEFAULT_OPEN
      : value.split(',').filter((v): v is SectionId => isSectionId(v)),
  );

const SectionFallback: React.FC = () => (
  <Stack gap={1.5} sx={{ py: 1 }}>
    {[0, 1].map((i) => (
      <Skeleton
        key={i}
        variant="rectangular"
        height={i === 0 ? 120 : 220}
        sx={{ bgcolor: 'action.hover' }}
      />
    ))}
  </Stack>
);

/**
 * Transactions and miners on one page. The two used to be separate tabs;
 * they are one accordion now, under a pinned bar of the figures worth
 * remembering. Their old paths redirect here with a hash, which opens that
 * section and scrolls to it, so /miners still lands on the miners view.
 */
const NetworkPage: React.FC = () => {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const open = useMemo(
    () => parseOpen(searchParams.get(OPEN_PARAM)),
    [searchParams],
  );
  // Read inside the hash effect without making it re-run on every toggle.
  const openRef = useRef(open);
  openRef.current = open;
  // Set when a hash opened a folded section: the scroll waits for the
  // section to finish expanding, since its height is 0 until then.
  const pendingScroll = useRef<SectionId | null>(null);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    const main = el?.closest('main');
    if (!el || !main) return;
    const top =
      el.getBoundingClientRect().top -
      main.getBoundingClientRect().top +
      main.scrollTop -
      KPI_STRIP_H;
    main.scrollTo({ top: Math.max(0, top) });
  }, []);

  const toggle = useCallback(
    (id: SectionId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const shown = parseOpen(prev.get(OPEN_PARAM));
          if (shown.has(id)) shown.delete(id);
          else shown.add(id);
          // Written even when empty ("open="), so "everything folded" is
          // distinguishable from "no preference expressed yet".
          next.set(OPEN_PARAM, [...shown].join(','));
          return next;
        },
        // Folding a section is not a place in history to go back to.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const id = hash.replace('#', '');
    if (!isSectionId(id)) return;
    const shown = openRef.current;
    const next = new URLSearchParams(searchParams);
    if (!shown.has(id)) {
      // Scroll once the section has finished expanding — its height is 0
      // until then, so an anchor computed now would land short.
      pendingScroll.current = id;
      next.set(OPEN_PARAM, [...shown, id].join(','));
    } else {
      // AppLayout resets the scroll container to the top on navigation, and
      // that effect (a parent's) runs after this one — so land the anchor on
      // the next frame, once the reset has happened.
      pendingScroll.current = null;
      requestAnimationFrame(() => scrollTo(id));
    }
    // Consume the hash. The open set lives in the query string from here,
    // and clearing it means clicking the same link again is a real change
    // rather than a no-op the router never reports.
    navigate({ search: next.toString() }, { replace: true });
    // searchParams is deliberately absent: this runs on arrival at a hash,
    // not every time a section is folded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, navigate, scrollTo]);

  return (
    <Page title="Network">
      <SEO
        title="Network"
        description="Transactions and miners for Allways — Bittensor SN7"
      />
      <NetworkKpiStrip />
      <Box
        sx={{
          backgroundColor: 'background.default',
          px: { xs: 1.5, sm: 2, md: 3 },
          pb: { xs: 2, md: 3 },
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        <Stack>
          {SECTIONS.map((s, i) => (
            <SectionAccordion
              key={s.id}
              {...s}
              first={i === 0}
              scrollMarginTop={KPI_STRIP_H}
              open={open.has(s.id)}
              onToggle={() => toggle(s.id)}
              onEntered={() => {
                if (pendingScroll.current !== s.id) return;
                pendingScroll.current = null;
                scrollTo(s.id);
              }}
            >
              {s.id === 'transactions' ? (
                <TransactionsSection />
              ) : (
                <Suspense fallback={<SectionFallback />}>
                  <MinersSection />
                </Suspense>
              )}
            </SectionAccordion>
          ))}
        </Stack>
      </Box>
    </Page>
  );
};

export default NetworkPage;
