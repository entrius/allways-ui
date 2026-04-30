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

const PROPS: Prop[] = [
  {
    Icon: VerifiedUserOutlinedIcon,
    title: 'Trustless',
    body: 'Allways collateral guarantees delivery. The contract slashes on failure and refunds users automatically.',
  },
  {
    Icon: TrendingUpOutlinedIcon,
    title: 'Best rate',
    body: 'Dynamic pricing. Allways continuously updates rates every block to ensure you get the best quote.',
  },
  {
    Icon: HubOutlinedIcon,
    title: 'Subnet-native',
    body: 'Built on Bittensor SN7. Settle in TAO, earn in TAO, watch the network in real time.',
  },
  {
    Icon: CodeOutlinedIcon,
    title: 'Open + agentic',
    body: 'Open source, public API, SSE feeds, and a one-click context bundle for AI agents.',
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
