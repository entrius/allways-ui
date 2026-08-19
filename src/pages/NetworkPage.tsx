import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { Page, SEO } from '../components';
import {
  MinersSection,
  NetworkKpiStrip,
  SectionAccordion,
  StatsSection,
  TransactionsSection,
} from '../components/network';

// The pinned ribbon's height — an anchored section stops below it, not
// under it.
const STRIP_H = 40;

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
  {
    id: 'stats',
    title: 'Network Stats',
    subtitle:
      'All-time growth, throughput, revenue and network size, by day since launch.',
  },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// The tape is what the page is for; miners and the stats charts start
// folded away under their headings, one click from open.
const DEFAULT_OPEN: Record<SectionId, boolean> = {
  transactions: true,
  miners: false,
  stats: false,
};

const isSectionId = (v: string): v is SectionId =>
  SECTIONS.some((s) => s.id === v);

/**
 * Transactions, miners and network stats on one page. The three used to be
 * separate tabs; they are one accordion now, under a pinned terminal ribbon
 * of the network's headline numbers. Their old paths redirect here with a
 * hash, which opens that section and scrolls to it, so /miners still lands
 * on the miners view.
 */
const NetworkPage: React.FC = () => {
  const { hash } = useLocation();
  const [open, setOpen] = useState<Record<SectionId, boolean>>(DEFAULT_OPEN);
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
      STRIP_H;
    main.scrollTo({ top: Math.max(0, top) });
  }, []);

  useEffect(() => {
    const id = hash.replace('#', '');
    if (!isSectionId(id)) return;
    if (!openRef.current[id]) {
      pendingScroll.current = id;
      setOpen((o) => ({ ...o, [id]: true }));
      return;
    }
    // Already open: AppLayout resets the scroll container to the top on
    // navigation, and that effect (a parent's) runs after this one — so
    // land the anchor on the next frame, once the reset has happened.
    const frame = requestAnimationFrame(() => scrollTo(id));
    return () => cancelAnimationFrame(frame);
  }, [hash, scrollTo]);

  return (
    <Page title="Network">
      <SEO
        title="Network"
        description="Transactions, miners and network stats for Allways — Bittensor SN7"
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
              scrollMarginTop={STRIP_H}
              open={open[s.id]}
              onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
              onEntered={() => {
                if (pendingScroll.current !== s.id) return;
                pendingScroll.current = null;
                scrollTo(s.id);
              }}
            >
              {s.id === 'transactions' ? (
                <TransactionsSection />
              ) : s.id === 'miners' ? (
                <MinersSection />
              ) : (
                <StatsSection />
              )}
            </SectionAccordion>
          ))}
        </Stack>
      </Box>
    </Page>
  );
};

export default NetworkPage;
