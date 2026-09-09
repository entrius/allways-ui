import React from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
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
  display: 'inline-block',
  lineHeight: 1.4,
  '&:hover': { color: 'primary.main' },
};

const Footer: React.FC = () => {
  // The brand block and the link columns belong to the landing page; the
  // app pages end on the bottom bar alone, so the desk or the tape is the
  // last thing on the page rather than a second site map.
  const full = useLocation().pathname === '/';
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
        py: full ? { xs: 5, md: 8 } : 2.5,
      }}
    >
      {/* On the landing page the footer sits in the landing section frame,
          so its columns line up with the cards above; app pages keep the
          bottom bar full-bleed like the nav. */}
      <Box sx={full ? { maxWidth: 1400, mx: 'auto', px: { md: 2 } } : {}}>
        {full && (
          <Grid container spacing={{ xs: 4, md: 6 }}>
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
                Universal transaction layer. Native peer to peer transactions on
                Bittensor Subnet 7 — no wrapped tokens, no bridges, no
                custodian.
              </Typography>
            </Grid>

            <Grid item xs={6} md={3}>
              <Stack>
                <Typography sx={colHeadSx}>Product</Typography>
                <Stack spacing={1.25} alignItems="flex-start">
                  <Box component={RouterLink} to="/market" sx={linkSx}>
                    Markets
                  </Box>
                  <Box
                    component={RouterLink}
                    to="/network#transactions"
                    sx={linkSx}
                  >
                    Transactions
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
              <Stack>
                <Typography sx={colHeadSx}>Network</Typography>
                <Stack spacing={1.25} alignItems="flex-start">
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
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={
            full
              ? {
                  mt: { xs: 5, md: 8 },
                  pt: 2.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }
              : {}
          }
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.5, sm: 2 }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
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
            <Box
              component="a"
              href={LINKS.terms}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ ...linkSx, fontSize: '0.7rem', py: 0 }}
            >
              Terms of Service
            </Box>
            <Box
              component="a"
              href={LINKS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ ...linkSx, fontSize: '0.7rem', py: 0 }}
            >
              Privacy Policy
            </Box>
          </Stack>
          <SocialLinks size={16} spacing={0.75} />
        </Stack>
        {full && (
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.7rem',
              color: 'text.disabled',
              mt: 2.5,
              maxWidth: 880,
              lineHeight: 1.55,
            }}
          >
            Allways is permissionless, open-source, beta software. Swaps settle
            directly between counterparty wallets; the protocol never takes
            custody of user funds, and the protocol fee is charged against miner
            collateral rather than any user transfer. Validator operators,
            including those run by the project, verify swap outcomes but cannot
            redirect or receive any transferred amount. All code is open source
            and should be responsibly reviewed before any use. Use at your own
            risk. No warranty. Not financial advice.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Footer;
