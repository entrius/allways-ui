import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { FONTS } from '../../theme';
import { useThemeMode } from '../../ThemeContext';
import HoverCard from '../HoverCard';
import Section from './Section';

const AgentTeaser: React.FC = () => {
  const { mode } = useThemeMode();
  return (
    <Section borderBottom={false}>
      <HoverCard
        sx={{
          position: 'relative',
          overflow: 'hidden',
          '&:hover .agent-arrow': { transform: 'translateX(4px)' },
        }}
      >
        <Box
          component={RouterLink}
          to="/agents"
          sx={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={{ xs: 3, md: 4 }}
            sx={{ p: { xs: 3, md: 5 } }}
          >
            <Box
              aria-hidden
              component="img"
              src="/hero/allways-3.png"
              alt=""
              sx={{
                position: 'absolute',
                right: { xs: -40, md: -20 },
                top: '50%',
                transform: 'translateY(-50%)',
                height: { xs: 180, md: 260 },
                opacity: mode === 'dark' ? 0.06 : 0.05,
                filter: mode === 'dark' ? 'invert(1)' : 'none',
                pointerEvents: 'none',
              }}
            />

            <Stack
              sx={{ flex: 1, position: 'relative', zIndex: 1 }}
              spacing={1}
            >
              <Typography variant="eyebrow">For AI Agents</Typography>
              <Typography
                variant="display"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  letterSpacing: '-0.02em',
                  color: 'text.primary',
                  lineHeight: 1.05,
                }}
              >
                One click to teach an agent Allways.
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.95rem',
                  color: 'text.secondary',
                  maxWidth: 620,
                  lineHeight: 1.55,
                }}
              >
                Copy a single markdown bundle of context, CLI, and API. Paste it
                into any LLM and it can quote, exchange, and watch live state.
              </Typography>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'primary.main',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <span>Open agents</span>
              <ArrowForwardIcon
                className="agent-arrow"
                sx={{ fontSize: 18, transition: 'transform 120ms' }}
              />
            </Stack>
          </Stack>
        </Box>
      </HoverCard>
    </Section>
  );
};

export default AgentTeaser;
