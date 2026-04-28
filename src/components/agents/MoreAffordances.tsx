import React from 'react';
import { Box, Chip, Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FONTS } from '../../theme';
import { useCopy } from '../../hooks';
import HoverCard from '../HoverCard';

const sseSnippet = `const es = new EventSource('/sse');
es.addEventListener('swap', (e) => {
  const swap = JSON.parse(e.data);
  console.log(swap.swapId, swap.status);
});`;

interface CardProps {
  title: string;
  blurb: string;
  badge?: string;
  code?: string;
  link?: { href: string; label: string };
}

const AgentCard: React.FC<CardProps> = ({
  title,
  blurb,
  badge,
  code,
  link,
}) => {
  const { copied, copy } = useCopy();

  return (
    <HoverCard sx={{ backgroundColor: 'surface.light', height: '100%' }}>
      <Stack sx={{ height: '100%', gap: 1.5 }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
          sx={{ p: { xs: 2, md: 2.5 }, pb: 0 }}
        >
          <Stack spacing={0.5}>
            <Typography
              variant="display"
              sx={{
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.85rem',
                color: 'text.secondary',
                lineHeight: 1.5,
              }}
            >
              {blurb}
            </Typography>
          </Stack>
          {badge && (
            <Chip
              label={badge}
              size="small"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: 0,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'transparent',
                color: 'text.secondary',
                height: 20,
              }}
            />
          )}
        </Stack>

        {code && (
          <Box
            sx={{
              mx: { xs: 2, md: 2.5 },
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
              position: 'relative',
            }}
          >
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                fontFamily: FONTS.mono,
                fontSize: '0.72rem',
                lineHeight: 1.5,
                color: 'text.primary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 180,
                overflow: 'auto',
              }}
            >
              {code}
            </Box>
            <Tooltip title={copied ? 'Copied' : 'Copy'} arrow>
              <IconButton
                onClick={() => copy(code)}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  borderRadius: 0,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {copied ? (
                  <CheckIcon sx={{ fontSize: 14 }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {link && (
          <Box sx={{ px: { xs: 2, md: 2.5 } }}>
            <Box
              component="a"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {link.label}
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Box>
          </Box>
        )}

        <Box sx={{ pb: { xs: 2, md: 2.5 } }} />
      </Stack>
    </HoverCard>
  );
};

const MoreAffordances: React.FC = () => (
  <Grid container spacing={{ xs: 2, md: 3 }}>
    <Grid item xs={12} md={6}>
      <AgentCard
        title="Live SSE stream"
        blurb="Subscribe to /sse for push updates on miners, swaps, and contract events. Avoids polling entirely."
        code={sseSnippet}
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <AgentCard
        title="OpenAPI spec"
        badge="Soon"
        blurb="Machine-readable API description — point any OpenAPI codegen at it to scaffold a typed client in your agent's language of choice."
        link={{ href: '/openapi.json', label: 'View /openapi.json' }}
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <AgentCard
        title="Source repos"
        blurb="The contract, neurons, CLI, and this UI are all open source. Read the implementation if you want ground truth."
        link={{
          href: 'https://github.com/entrius/allways',
          label: 'github.com/entrius/allways',
        }}
      />
    </Grid>
  </Grid>
);

export default MoreAffordances;
