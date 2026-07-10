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
            {/* Thin circle line-work, same family as the hero background. */}
            <Box
              aria-hidden
              component="svg"
              viewBox="0 0 600 300"
              preserveAspectRatio="xMaxYMid slice"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                opacity: mode === 'dark' ? 0.5 : 1,
              }}
            >
              <circle
                cx="540"
                cy="90"
                r="150"
                fill="none"
                stroke="#0052ff"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <circle
                cx="470"
                cy="230"
                r="190"
                fill="none"
                stroke="#0052ff"
                strokeOpacity="0.12"
                strokeWidth="1"
              />
            </Box>

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
                into any agent harness and it can quote, exchange, and watch
                live state.
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
