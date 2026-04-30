import React from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FONTS } from '../../theme';
import BrandMark from '../BrandMark';
import SocialLinks from './SocialLinks';
import { LINKS, docsUrl } from './links';

const colHeadSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.65rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  mb: 1.5,
};

const linkSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.8rem',
  color: 'text.primary',
  textDecoration: 'none',
  py: 0.4,
  display: 'inline-block',
  '&:hover': { color: 'primary.main' },
};

const Footer: React.FC = () => {
  const docs = docsUrl();

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
        px: { xs: 1.5, sm: 2, md: 4 },
        py: { xs: 4, md: 6 },
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <BrandMark size={28} />
              <Typography
                sx={{
                  fontFamily: FONTS.heading,
                  fontWeight: 900,
                  fontSize: '1rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Allways
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.85rem',
                color: 'text.secondary',
                mt: 1.5,
                maxWidth: 360,
                lineHeight: 1.5,
              }}
            >
              Universal transaction layer. Trustless peer to peer transactions on
              Bittensor Subnet 7.
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.7rem',
                color: 'text.disabled',
                mt: 1.5,
                maxWidth: 460,
                lineHeight: 1.55,
              }}
            >
              Allways is permissionless, open-source, beta software. The
              protocol facilitates trustless peer to peer transactions — the
              creators and contributors do not custody, control, or intermediate
              any funds. All code is open source and should be responsibly
              reviewed before any use. Use at your own risk. No warranty. Not
              financial advice.
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
            <Stack sx={{ height: '100%' }}>
              <Typography sx={colHeadSx}>Product</Typography>
              <Stack sx={{ flex: 1, justifyContent: 'space-between' }}>
                <Box component={RouterLink} to="/dashboard" sx={linkSx}>
                  Dashboard
                </Box>
                <Box component={RouterLink} to="/swap" sx={linkSx}>
                  Exchange
                </Box>
                <Box component={RouterLink} to="/agents" sx={linkSx}>
                  Agents
                </Box>
                <Box
                  component="a"
                  href={docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={linkSx}
                >
                  Docs
                </Box>
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={6} md={3}>
            <Stack sx={{ height: '100%' }}>
              <Typography sx={colHeadSx}>Network</Typography>
              <Stack sx={{ flex: 1, justifyContent: 'space-between' }}>
                <Box
                  component="a"
                  href={LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={linkSx}
                >
                  GitHub
                </Box>
                <Box
                  component="a"
                  href={LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={linkSx}
                >
                  X
                </Box>
                <Box
                  component="a"
                  href={LINKS.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={linkSx}
                >
                  Discord
                </Box>
                <Box
                  component="a"
                  href={LINKS.status}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={linkSx}
                >
                  Status
                </Box>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{
            mt: { xs: 4, md: 6 },
            pt: 2.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              color: 'text.secondary',
              letterSpacing: '0.05em',
            }}
          >
            © 2026 Allways · Bittensor SN7
          </Typography>
          <SocialLinks size={16} spacing={0.75} />
        </Stack>
      </Box>
    </Box>
  );
};

export default Footer;
