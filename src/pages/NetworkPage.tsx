import React, { useEffect } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { Page, SEO } from '../components';
import {
  MinersSection,
  NetworkKpiStrip,
  StatsSection,
  TransactionsSection,
} from '../components/network';
import { FONTS } from '../theme';

// The pinned ribbon's height — an anchored section stops below it, not
// under it.
const STRIP_H = 40;

const SECTIONS = [
  {
    id: 'transactions',
    title: 'Transactions',
    subtitle:
      'Every cross-chain transaction in order, with its status and progress through the lifecycle. Click a row for the full timeline.',
  },
  {
    id: 'miners',
    title: 'Miners',
    subtitle:
      'Who is serving the network right now: crown share, success rate, collateral and volume per node.',
  },
  {
    id: 'stats',
    title: 'Network Stats',
    subtitle:
      "All-time daily history across the network. UTC days — today's bucket is still filling.",
  },
] as const;

// Section band: the page reads as one continuous scroll, so each section
// announces itself with a rule and a heading rather than a tab.
const SectionBand: React.FC<{
  id: string;
  title: string;
  subtitle: string;
  first?: boolean;
  children: React.ReactNode;
}> = ({ id, title, subtitle, first, children }) => (
  <Box
    component="section"
    id={id}
    sx={{
      scrollMarginTop: `${STRIP_H}px`,
      pt: first ? 0 : { xs: 3, md: 4 },
      borderTop: first ? 0 : '1px solid',
      borderColor: 'divider',
    }}
  >
    <Box sx={{ pt: first ? 0 : { xs: 2, md: 2.5 }, pb: { xs: 1.5, md: 2 } }}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: { xs: '0.8rem', md: '0.9rem' },
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.68rem',
          color: 'text.secondary',
          mt: 0.5,
          maxWidth: 720,
        }}
      >
        {subtitle}
      </Typography>
    </Box>
    {children}
  </Box>
);

/**
 * Transactions, miners and network stats on one page. The three used to be
 * separate tabs; they are one scroll now, under a pinned terminal ribbon of
 * the network's headline numbers. Their old paths redirect here with a hash,
 * so /miners lands on the miners section rather than a dead link.
 */
const NetworkPage: React.FC = () => {
  const { hash } = useLocation();

  useEffect(() => {
    const id = hash.replace('#', '');
    if (!id) return;
    // AppLayout resets the scroll container to the top on navigation, and
    // that effect (a parent's) runs after this one — so land the anchor on
    // the next frame, once the reset has already happened.
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      const main = el?.closest('main');
      if (!el || !main) return;
      const top =
        el.getBoundingClientRect().top -
        main.getBoundingClientRect().top +
        main.scrollTop -
        STRIP_H;
      main.scrollTo({ top: Math.max(0, top) });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);

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
          pb: { xs: 3, md: 4 },
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        <Stack>
          {SECTIONS.map((s, i) => (
            <SectionBand key={s.id} {...s} first={i === 0}>
              {s.id === 'transactions' ? (
                <TransactionsSection />
              ) : s.id === 'miners' ? (
                <MinersSection />
              ) : (
                <StatsSection />
              )}
            </SectionBand>
          ))}
        </Stack>
      </Box>
    </Page>
  );
};

export default NetworkPage;
