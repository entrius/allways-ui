import React from 'react';
import {
  Box,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import type { ScoreFactors } from '../../api';
import { FONTS } from '../../theme';
import { formatTao } from '../../utils/format';

const fmtMultiplier = (factor: number): string => `${factor.toFixed(2)}×`;

const fmtPct = (pct: number, digits = 0): string =>
  `${(pct * 100).toFixed(digits)}%`;

type Delta = { value: number; format: 'pct' | 'mult' } | null;

type Card = {
  label: string;
  window: string;
  headline: string;
  fill: number; // 0..1
  description: string;
  delta?: Delta;
  weak?: boolean;
  tooltip?: string;
};

// Mirrors CREDIBILITY_MAX_TIMEOUTS in allways/das-allways — used for display copy
// only; the zeroing itself is computed server-side.
const CREDIBILITY_MAX_TIMEOUTS = 2;

const buildCards = (sf: ScoreFactors): Card[] => {
  const credibilityRamped = sf.closedSwaps >= sf.credibilityRampTarget;
  // Ramp forced to 0 while closed swaps exist = the timeout hard-floor tripped.
  const zeroedByTimeouts = sf.closedSwaps > 0 && sf.credibilityRamp === 0;
  return [
    {
      label: 'Crown share',
      window: 'previous round',
      headline: fmtPct(sf.crownShareWindow),
      fill: sf.crownShareWindow,
      description: 'your slice of the crown over that 1-hour window',
      delta: {
        value: sf.crownShareWindow - sf.previousCrownShareWindow,
        format: 'pct',
      },
      weak: sf.crownShareWindow < 0.05,
    },
    {
      label: 'Capacity',
      window: 'snapshot',
      headline: fmtMultiplier(sf.capacityFactor),
      fill: sf.capacityFactor,
      description: `${formatTao(sf.collateralRao)} / ${formatTao(
        sf.maxSwapAmountRao,
      )} τ collateral`,
      weak: sf.capacityFactor < 0.5,
    },
    {
      label: 'Volume factor',
      window: 'previous round',
      headline: fmtMultiplier(sf.volumeFactor),
      fill: sf.volumeFactor,
      description: `served ${fmtPct(sf.volumeShareWindow)} of network volume`,
      delta: {
        value: sf.volumeFactor - sf.previousVolumeFactor,
        format: 'mult',
      },
      weak: sf.volumeFactor <= 0.5,
    },
    {
      label: 'Success rate',
      window: 'last 30d',
      headline: sf.closedSwaps === 0 ? '—' : fmtPct(sf.successRate30d),
      fill: sf.successRate30d,
      description:
        sf.closedSwaps === 0
          ? 'no closed swaps in window'
          : `${sf.closedSwaps} closed · raw fulfillment rate`,
      weak: sf.closedSwaps > 0 && sf.successRate30d < 0.5,
    },
    {
      label: 'Credibility',
      window: 'last 30d',
      headline: zeroedByTimeouts
        ? fmtMultiplier(0)
        : credibilityRamped
          ? fmtMultiplier(1.0)
          : fmtMultiplier(sf.credibilityRamp),
      fill: sf.credibilityRamp,
      description: zeroedByTimeouts
        ? `auto-zeroed · ${sf.credibilityTimedOut} timeouts (limit ${CREDIBILITY_MAX_TIMEOUTS})`
        : credibilityRamped
          ? `fully ramped · ${sf.closedSwaps} of ${sf.credibilityRampTarget} closed`
          : `${sf.closedSwaps} / ${sf.credibilityRampTarget} closed · resets if you fall below`,
      tooltip: zeroedByTimeouts
        ? `More than ${CREDIBILITY_MAX_TIMEOUTS} timed-out swaps in the 30-day window zero your credibility — and with it your whole reward. It recovers as old timeouts age out of the window.`
        : undefined,
      weak: zeroedByTimeouts || !credibilityRamped,
    },
  ];
};

const PLACEHOLDER_CARDS: Card[] = [
  {
    label: 'Crown share',
    window: 'previous round',
    headline: '—',
    fill: 0,
    description: '',
  },
  {
    label: 'Capacity',
    window: 'snapshot',
    headline: '—',
    fill: 0,
    description: '',
  },
  {
    label: 'Volume factor',
    window: 'previous round',
    headline: '—',
    fill: 0,
    description: '',
  },
  {
    label: 'Success rate',
    window: 'last 30d',
    headline: '—',
    fill: 0,
    description: '',
  },
  {
    label: 'Credibility',
    window: 'last 30d',
    headline: '—',
    fill: 0,
    description: '',
  },
];

const DeltaBadge: React.FC<{ delta: Delta }> = ({ delta }) => {
  const theme = useTheme();
  if (!delta) return null;
  const epsilon = delta.format === 'pct' ? 0.005 : 0.01;
  if (Math.abs(delta.value) < epsilon) {
    return (
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.62rem',
          color: 'text.disabled',
          letterSpacing: '0.04em',
        }}
      >
        ─ flat
      </Typography>
    );
  }
  const up = delta.value > 0;
  const formatted =
    delta.format === 'pct'
      ? `${up ? '+' : '−'}${(Math.abs(delta.value) * 100).toFixed(1)}%`
      : `${up ? '+' : '−'}${Math.abs(delta.value).toFixed(2)}×`;
  return (
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.62rem',
        color: up
          ? theme.palette.status.active
          : alpha(theme.palette.text.primary, 0.55),
        letterSpacing: '0.04em',
      }}
    >
      {up ? '▲' : '▼'} {formatted}
    </Typography>
  );
};

const FactorCard: React.FC<{ card: Card }> = ({ card }) => {
  const theme = useTheme();
  const fill = Math.max(0, Math.min(1, card.fill));
  const barColor = card.weak
    ? alpha(theme.palette.primary.main, 0.45)
    : theme.palette.primary.main;
  const headlineColor = card.weak ? 'text.secondary' : 'text.primary';

  const body = (
    <Box sx={{ px: 2.25, py: 2, minWidth: 0 }}>
      <Typography
        variant="monoSmall"
        sx={{
          fontSize: '0.55rem',
          letterSpacing: '0.22em',
          color: 'text.disabled',
          textTransform: 'uppercase',
          mb: 1,
        }}
      >
        {card.label}
        <Box
          component="span"
          sx={{ color: 'text.disabled', opacity: 0.6, ml: 0.75 }}
        >
          · {card.window}
        </Box>
      </Typography>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
      >
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontSize: '1.55rem',
            fontWeight: 500,
            lineHeight: 1,
            color: headlineColor,
            letterSpacing: '-0.02em',
          }}
        >
          {card.headline}
        </Typography>
        {card.delta && <DeltaBadge delta={card.delta} />}
      </Stack>
      <Box
        sx={{
          mt: 1.25,
          height: 2,
          backgroundColor: alpha(theme.palette.text.primary, 0.08),
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${fill * 100}%`,
            backgroundColor: barColor,
            borderRadius: 999,
            transition: 'width 0.4s ease',
          }}
        />
      </Box>
      <Typography
        sx={{
          mt: 1,
          fontFamily: FONTS.body,
          fontSize: '0.68rem',
          color: 'text.secondary',
          minHeight: '1.2em',
        }}
      >
        {card.description}
      </Typography>
    </Box>
  );

  if (!card.tooltip) return body;
  return (
    <Tooltip title={card.tooltip} arrow placement="top">
      {body}
    </Tooltip>
  );
};

const composeMultiplier = (sf: ScoreFactors): number =>
  sf.crownShareWindow *
  sf.capacityFactor *
  sf.volumeFactor *
  // TODO: display reads rate³ × ramp; underlying math is (rate × ramp)³ — fix later
  (sf.successRate30d * sf.credibilityRamp) ** 3;

const CompositeFooter: React.FC<{ sf: ScoreFactors | undefined }> = ({
  sf,
}) => {
  const theme = useTheme();
  if (!sf) return null;
  const m = composeMultiplier(sf);
  return (
    <Stack
      direction="row"
      alignItems="baseline"
      justifyContent="space-between"
      sx={{
        px: 2.25,
        py: 1.75,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: alpha(theme.palette.text.primary, 0.02),
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{
          fontSize: '0.58rem',
          letterSpacing: '0.18em',
          color: 'text.disabled',
          textTransform: 'uppercase',
        }}
      >
        share of pool captured this round
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.95rem',
          color: 'text.primary',
          letterSpacing: '-0.01em',
        }}
      >
        {fmtMultiplier(m)}
        <Box component="span" sx={{ color: 'text.disabled', ml: 0.75 }}>
          = crown × cap × vol × rate³ × ramp
        </Box>
      </Typography>
    </Stack>
  );
};

// Renders the 5 factor cards + composite footer. When `windowCrownShare`
// is 0 the row dims to 0.4 — the factors compose multiplicatively against
// crown_share, so none of them contribute to emission when crown is zero.
const ScoreFactorsStrip: React.FC<{
  scoreFactors: ScoreFactors | undefined;
  windowCrownShare?: number;
}> = ({ scoreFactors, windowCrownShare }) => {
  const cards = scoreFactors ? buildCards(scoreFactors) : PLACEHOLDER_CARDS;
  const dim =
    windowCrownShare != null && scoreFactors != null && windowCrownShare <= 0;

  return (
    <Box sx={{ opacity: dim ? 0.4 : 1, transition: 'opacity 0.2s ease' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          '& > *': {
            borderRight: { sm: '1px solid' },
            borderColor: 'divider',
          },
          '& > *:nth-of-type(2n)': {
            borderRight: { sm: 'none', md: '1px solid' },
          },
          '& > *:nth-of-type(5n)': { borderRight: { md: 'none' } },
          '& > *:not(:first-of-type)': {
            borderTop: { xs: '1px solid', sm: 'none' },
            borderColor: 'divider',
          },
          '& > *:nth-of-type(n + 3)': {
            borderTop: { sm: '1px solid', md: 'none' },
            borderColor: 'divider',
          },
        }}
      >
        {cards.map((c) => (
          <FactorCard key={c.label} card={c} />
        ))}
      </Box>
      <CompositeFooter sf={scoreFactors} />
    </Box>
  );
};

export default ScoreFactorsStrip;
