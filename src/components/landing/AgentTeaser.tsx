import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { FONTS } from '../../theme';
import { useThemeMode } from '../../ThemeContext';

const AgentTeaser: React.FC = () => {
  const { mode } = useThemeMode();
  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: 'background.default',
        px: { xs: 2, sm: 3, md: 6 },
        py: { xs: 6, md: 10 },
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack
          component={RouterLink}
          to="/agents"
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={{ xs: 3, md: 4 }}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 3, md: 5 },
            textDecoration: 'none',
            transition: 'border-color 120ms',
            '&:hover': {
              borderColor: 'primary.main',
              '& .agent-arrow': { transform: 'translateX(4px)' },
            },
          }}
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

          <Stack sx={{ flex: 1, position: 'relative', zIndex: 1 }} spacing={1}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'primary.main',
              }}
            >
              For AI Agents
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.heading,
                fontWeight: 900,
                fontSize: { xs: '1.5rem', md: '2rem' },
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: 'text.primary',
                lineHeight: 1.05,
              }}
            >
              One click to teach your agent Allways.
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
              into any LLM and it can quote, swap, and watch live state.
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
    </Box>
  );
};

export default AgentTeaser;
