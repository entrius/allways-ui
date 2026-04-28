import React from 'react';
import { IconButton, Stack, Tooltip } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import XIcon from '@mui/icons-material/X';
import { LINKS } from './links';

const DiscordIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M20.317 4.369A19.79 19.79 0 0016.558 3.2a.075.075 0 00-.079.037c-.34.604-.717 1.39-.98 2.01a18.27 18.27 0 00-5.486 0 12.64 12.64 0 00-.99-2.01.077.077 0 00-.079-.037A19.74 19.74 0 003.683 4.37a.07.07 0 00-.032.027C.533 9.043-.32 13.58.099 18.058a.082.082 0 00.031.056 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.027 14.21 14.21 0 001.226-1.994.076.076 0 00-.041-.105 13.1 13.1 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.371-.291a.075.075 0 01.077-.01c3.927 1.793 8.18 1.793 12.061 0a.075.075 0 01.078.01c.12.099.245.197.372.291a.077.077 0 01-.006.128 12.3 12.3 0 01-1.873.891.077.077 0 00-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 00-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const iconBtnSx = {
  color: 'text.secondary',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 0,
  p: 0.75,
  '&:hover': {
    backgroundColor: 'action.hover',
    color: 'primary.main',
    borderColor: 'primary.main',
  },
} as const;

interface Props {
  size?: number;
  spacing?: number;
}

const SocialLinks: React.FC<Props> = ({ size = 18, spacing = 1 }) => (
  <Stack direction="row" spacing={spacing}>
    <Tooltip title="GitHub" arrow>
      <IconButton
        component="a"
        href={LINKS.github}
        target="_blank"
        rel="noopener noreferrer"
        sx={iconBtnSx}
      >
        <GitHubIcon sx={{ fontSize: size }} />
      </IconButton>
    </Tooltip>
    <Tooltip title="X" arrow>
      <IconButton
        component="a"
        href={LINKS.twitter}
        target="_blank"
        rel="noopener noreferrer"
        sx={iconBtnSx}
      >
        <XIcon sx={{ fontSize: size }} />
      </IconButton>
    </Tooltip>
    <Tooltip title="Discord" arrow>
      <IconButton
        component="a"
        href={LINKS.discord}
        target="_blank"
        rel="noopener noreferrer"
        sx={iconBtnSx}
      >
        <DiscordIcon size={size} />
      </IconButton>
    </Tooltip>
  </Stack>
);

export default SocialLinks;
