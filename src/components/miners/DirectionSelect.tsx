import React from 'react';
import {
  useLiveDirections,
  directionLabel,
  isDirection,
  type Direction,
} from '../../api';
import MonoSelect from '../MonoSelect';

const ALL_PAIRS = 'all';

/**
 * The page's one direction picker, rendered through MonoSelect so it reads
 * as the same control as every other dropdown on the site: a mono chip with
 * a caret, opening a menu of the directions. It replaced a toggle-button
 * wall that grew a button per direction, and later an outlined MUI Select
 * that matched nothing else.
 */
const DirectionSelect: React.FC<{
  value: Direction | null;
  onChange: (d: Direction | null) => void;
  // With allowAll, null renders as an "All pairs" option; without it, null is
  // not selectable and onChange always yields a Direction.
  allowAll?: boolean;
  /** Kept for callers; the chip sizes to its label. */
  width?: number;
}> = ({ value, onChange, allowAll = false }) => {
  // Live routes plus the current pick, so a deep link never blanks the chip.
  const directions = useLiveDirections(value);
  const options = [
    ...(allowAll ? [{ value: ALL_PAIRS, label: 'All pairs' }] : []),
    ...directions.map((d) => ({
      value: d as string,
      label: directionLabel(d),
    })),
  ];
  return (
    <MonoSelect
      label="Direction"
      value={value ?? (allowAll ? ALL_PAIRS : '')}
      options={options}
      onChange={(v) => onChange(isDirection(v) ? v : null)}
    />
  );
};

export default DirectionSelect;
