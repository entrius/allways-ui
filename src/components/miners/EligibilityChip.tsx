import React from 'react';
import { useTheme } from '@mui/material';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';
import StatusChip from '../StatusChip';
import { formatWallClock } from '../../utils/format';

export type EligibilityState = 'eligible' | 'ineligible' | 'none';

// The strike-gate verdict, as the site's status chip. `live` marks a
// mid-round tip reading; otherwise the verdict is the last flushed round's
// and gets an "as of" stamp, since on-chain strikes land immediately but
// rounds only flush hourly.
const EligibilityChip: React.FC<{
  state: EligibilityState;
  live?: boolean;
  asOf?: number | null;
}> = ({ state, live = false, asOf = null }) => {
  const theme = useTheme();
  const up = MOVE_COLORS[theme.palette.mode].up;
  const color = state === 'eligible' ? up : theme.palette.text.disabled;
  const label =
    state === 'eligible'
      ? 'eligible'
      : state === 'ineligible'
        ? 'not eligible'
        : 'no scored rounds yet';
  const stale = !live && asOf != null && state !== 'none';
  const hint =
    state === 'none'
      ? 'No validator score rows yet for this miner.'
      : live
        ? 'Live validator verdict, from the round being scored now.'
        : `Last scored round${asOf != null ? `, ${formatWallClock(asOf)}` : ''}. Rounds flush hourly, so an on-chain strike can precede the flip here by up to a round.`;
  return (
    <StatusChip
      label={label}
      color={color}
      icon={
        state === 'eligible' ? '✓' : state === 'ineligible' ? '✗' : undefined
      }
      note={stale ? `· as of ${formatWallClock(asOf)}` : undefined}
      hint={hint}
    />
  );
};

export default EligibilityChip;
