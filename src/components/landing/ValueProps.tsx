import React from 'react';
import { Grid, Stack, Typography } from '@mui/material';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import { FONTS } from '../../theme';
import HoverCard from '../HoverCard';
import Section from './Section';

interface Prop {
  Icon: React.ElementType;
  title: string;
  body: string;
}

// Bodies are written to matching lengths so the four cards render the same
// line count, and to the same trust principles as the steps above: concrete
// nouns, a stated mechanism, benefits addressed to "you", no insider jargon.
const PROPS: Prop[] = [
  {
    Icon: VerifiedUserOutlinedIcon,
    title: 'Guaranteed',
    body: 'Every transaction is backed by locked funds worth its full value. If delivery fails, you are repaid in full, automatically.',
  },
  {
    Icon: TrendingUpOutlinedIcon,
    title: 'Best rate',
    body: 'Nodes compete for every transaction, so posted rates keep improving. The rate you take is the best available.',
  },
  {
    Icon: HubOutlinedIcon,
    title: 'The real asset',
    body: 'Real BTC, real SOL, real TAO. No bridges, no IOUs, no wrapped tokens. What arrives settles natively on its own chain.',
  },
  {
    Icon: CodeOutlinedIcon,
    title: 'Open + agentic',
    body: 'The code is open source, every feed is public. One copy-paste teaches an AI agent to quote, transact, and watch.',
  },
];

const ValueProps: React.FC = () => (
  <Section
    eyebrow="Why allways"
    title="Built for the next million transactions."
  >
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {PROPS.map(({ Icon, title, body }) => (
        <Grid item xs={12} sm={6} md={3} key={title}>
          <HoverCard sx={{ p: { xs: 2.5, md: 3 }, height: '100%' }}>
            <Stack sx={{ height: '100%', gap: 1.75 }}>
              <Icon sx={{ fontSize: 22, color: 'primary.main' }} />
              <Typography
                variant="display"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  letterSpacing: '-0.01em',
                  color: 'text.primary',
                }}
              >
                {title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.85rem',
                  color: 'text.secondary',
                  lineHeight: 1.55,
                }}
              >
                {body}
              </Typography>
            </Stack>
          </HoverCard>
        </Grid>
      ))}
    </Grid>
  </Section>
);

export default ValueProps;
