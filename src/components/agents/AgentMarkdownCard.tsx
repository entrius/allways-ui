import React, { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import LinkIcon from '@mui/icons-material/Link';
import { FONTS } from '../../theme';
import { AGENT_MARKDOWN } from './AgentMarkdown';

const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
};

const btnSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  borderRadius: 0,
  py: 1.25,
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
} as const;

const AgentMarkdownCard: React.FC = () => {
  const md = useCopy();
  const link = useCopy();

  const llmsUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/llms.txt`
      : '/llms.txt';

  return (
    <Stack
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'surface.light',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack sx={{ flex: 1 }} spacing={0.5}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'primary.main',
            }}
          >
            One-click context bundle
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.heading,
              fontWeight: 800,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              letterSpacing: '-0.01em',
            }}
          >
            Hand this to your agent and it can use Allways.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="contained"
            onClick={() => md.copy(AGENT_MARKDOWN)}
            startIcon={
              md.copied ? (
                <CheckIcon sx={{ fontSize: 16 }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={btnSx}
          >
            {md.copied ? 'Copied' : 'Copy markdown'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => link.copy(llmsUrl)}
            startIcon={
              link.copied ? (
                <CheckIcon sx={{ fontSize: 16 }} />
              ) : (
                <LinkIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              ...btnSx,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            {link.copied ? 'Copied' : 'Copy URL'}
          </Button>
        </Stack>
      </Stack>

      <Box
        component="pre"
        sx={{
          m: 0,
          p: { xs: 2, md: 3 },
          maxHeight: '60vh',
          overflow: 'auto',
          fontFamily: FONTS.mono,
          fontSize: '0.78rem',
          lineHeight: 1.55,
          color: 'text.primary',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          backgroundColor: 'background.default',
        }}
      >
        {AGENT_MARKDOWN}
      </Box>
    </Stack>
  );
};

export default AgentMarkdownCard;
