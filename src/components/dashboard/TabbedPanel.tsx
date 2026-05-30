import React, { useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FONTS } from '../../theme';

export type PanelTab = {
  key: string;
  label: string;
  info?: React.ReactNode;
  node: React.ReactNode;
};

// A surface panel whose header is a row of mono-eyebrow tabs (the active tab
// doubles as the panel heading). Content fills the remaining height and is
// expected to scroll internally, so the panel itself never grows the page.
const TabbedPanel: React.FC<{ tabs: PanelTab[] }> = ({ tabs }) => {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        {tabs.map((t) => {
          const selected = t.key === active.key;
          return (
            <Box
              key={t.key}
              onClick={() => setActiveKey(t.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                pb: 0.5,
                borderBottom: '2px solid',
                borderColor: selected ? 'primary.main' : 'transparent',
                color: selected ? 'text.primary' : 'text.disabled',
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
                '&:hover': {
                  color: selected ? 'text.primary' : 'text.secondary',
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                {t.label}
              </Box>
              {selected && t.info && (
                <Tooltip title={t.info} arrow placement="top">
                  <Box
                    component="span"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ display: 'inline-flex', color: 'text.secondary' }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 13, display: 'block' }} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>
      <Box
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {active.node}
      </Box>
    </Box>
  );
};

export default TabbedPanel;
