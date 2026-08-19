import React from 'react';
import { Box, Menu, MenuItem, useTheme } from '@mui/material';
import { FONTS } from '../../theme';

// The app's one dropdown: a bordered mono trigger with a chevron over a
// styled menu, rather than the OS's native select popup (which ignores the
// site's type and color entirely). Used by every filter on the transactions
// explorer and by the date picker's month/year controls, so they all read as
// one control.
type Option<T extends string | number> = { value: T; label: string };

function SelectMenu<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  label,
  grow,
  active,
  width,
  height = 28,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  // Falls back to the matching option's label; pass one only when the current
  // value can sit outside the offered list.
  label?: string;
  grow?: boolean;
  // A non-default filter carries the same heavy border as the other fields.
  active?: boolean;
  width?: number;
  height?: number;
}): React.ReactElement {
  const theme = useTheme();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const shown =
    label ?? options.find((o) => o.value === value)?.label ?? String(value);
  return (
    <>
      <Box
        component="button"
        aria-label={ariaLabel}
        onClick={(e: React.MouseEvent<HTMLElement>) =>
          setAnchor(e.currentTarget)
        }
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          height,
          px: 0.75,
          ...(grow && { flex: 1 }),
          ...(width && { width }),
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          color: 'text.primary',
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor:
            active || anchor ? theme.palette.text.primary : 'divider',
          ...(active && { borderWidth: 2 }),
          '&:hover': { borderColor: theme.palette.border.light },
        }}
      >
        {shown}
        <Box
          component="span"
          sx={{ color: 'text.secondary', fontSize: '0.55rem' }}
        >
          ▾
        </Box>
      </Box>
      <Menu
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              backgroundImage: 'none',
              mt: 0.25,
            },
          },
        }}
        MenuListProps={{ sx: { py: 0 } }}
      >
        {options.map((o) => (
          <MenuItem
            key={o.value}
            selected={o.value === value}
            onClick={() => {
              onChange(o.value);
              setAnchor(null);
            }}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              minHeight: 0,
              py: 0.5,
              px: 1,
              // MUI's selected + focus-visible rule is more specific than a
              // plain `&.Mui-selected`, so name both or the item opens
              // wearing the default primary tint.
              '&.Mui-selected, &.Mui-selected.Mui-focusVisible': {
                backgroundColor: theme.palette.text.primary,
                color: theme.palette.background.paper,
                '&:hover': { backgroundColor: theme.palette.text.primary },
              },
              '&.Mui-focusVisible': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default SelectMenu;
