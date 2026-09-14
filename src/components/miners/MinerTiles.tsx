import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import { useMinerLeaderboard } from '../../api';
import { StatCell } from '../stats';
import { formatSol } from '../../utils/format';

/**
 * The miners fold's opening row, in the same tiles the Network Stats fold
 * opens with: how many miners are registered, how many are quoting, how
 * many hold a crown right now, and the collateral they have posted. Read
 * from the all-time leaderboard, the one list that names every miner.
 */
const MinerTiles: React.FC = () => {
  const { data, isLoading } = useMinerLeaderboard('all');
  const t = useMemo(() => {
    const rows = data ?? [];
    const hotkeys = new Set(rows.map((r) => r.hotkey));
    const active = new Set(rows.filter((r) => r.isActive).map((r) => r.hotkey));
    const crowned = new Set(
      rows
        .filter((r) => r.currentCrownDirections.length > 0)
        .map((r) => r.hotkey),
    );
    const directions = new Set(rows.flatMap((r) => r.currentCrownDirections));
    // Collateral arrives in lamports, as the table's formatSol expects.
    const collateral = rows.reduce((a, r) => a + parseFloat(r.collateral), 0);
    return {
      registered: hotkeys.size,
      active: active.size,
      crowned: crowned.size,
      directions: directions.size,
      collateral,
    };
  }, [data]);

  const tiles = [
    { label: 'Registered miners', value: String(t.registered) },
    {
      label: 'Quoting now',
      value: String(t.active),
      tooltip: 'miners with live rates on the book',
    },
    {
      label: 'Wearing a crown',
      value: String(t.crowned),
      sub: t.directions
        ? `· ${t.directions} ${t.directions === 1 ? 'direction' : 'directions'}`
        : undefined,
      tooltip: 'miners holding the best rate in at least one direction',
    },
    {
      label: 'Collateral posted',
      value: formatSol(t.collateral),
      unit: 'SOL',
    },
  ];

  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {tiles.map((tile) => (
        <Grid item xs={6} md={3} key={tile.label}>
          <StatCell
            label={tile.label}
            value={tile.value}
            unit={tile.unit}
            sub={tile.sub}
            tooltip={tile.tooltip}
            loading={isLoading}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default MinerTiles;
