import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { FONTS } from '../../theme';
import { formatRate } from '../../utils/format';
import type { RateChangedError } from '../../api/SwapApiClient';

interface Props {
  open: boolean;
  data?: RateChangedError;
  onAccept: () => void;
  onCancel: () => void;
}

const RateChangedDialog: React.FC<Props> = ({
  open,
  data,
  onAccept,
  onCancel,
}) => (
  <Dialog
    open={open}
    onClose={onCancel}
    PaperProps={{
      sx: {
        borderRadius: 0,
        border: '1px solid',
        borderColor: 'divider',
      },
    }}
  >
    <DialogTitle
      sx={{
        fontFamily: FONTS.heading,
        fontWeight: 700,
        fontSize: '1rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      Rate changed
    </DialogTitle>
    <DialogContent dividers>
      <Stack spacing={1.5} sx={{ minWidth: 280 }}>
        <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.85rem' }}>
          The miner's rate moved between your quote and the reservation request.
          Zero-tolerance — you must re-accept the new rate before continuing.
        </Typography>
        {data && (
          <Stack spacing={0.5}>
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
              Quoted
            </Typography>
            <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.9rem' }}>
              {formatRate(data.expected)}
            </Typography>
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
              New
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.9rem',
                color: 'primary.main',
              }}
            >
              {formatRate(data.actual)}
            </Typography>
          </Stack>
        )}
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="contained" onClick={onAccept}>
        Accept new rate
      </Button>
    </DialogActions>
  </Dialog>
);

export default RateChangedDialog;
