import React, { useCallback } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  CrownHistoryPanel,
  CrownRateChart,
  MinerDetailHeader,
  MinerSwapHistory,
  Page,
  SEO,
  StickyNetworkHeader,
} from '../components';
import {
  useMinerStats,
  useMiners,
  isCrownRange,
  isDirection,
  isRange,
  isRateRange,
  parseBlockParam,
  type CrownRange,
  type Range,
  type RateRange,
} from '../api';
import { FONTS } from '../theme';
import { shortHotkey } from '../utils/format';

const MinerDetailPage: React.FC = () => {
  const { hotkey = '' } = useParams<{ hotkey: string }>();
  const [params, setParams] = useSearchParams();

  const rangeParam = params.get('range');
  const range: Range = isRange(rangeParam) ? rangeParam : '30d';
  const rateRangeParam = params.get('rateRange');
  const rateRange: RateRange = isRateRange(rateRangeParam)
    ? rateRangeParam
    : '4h';
  const crownDirParam = params.get('crownDir');
  const crownDirection = isDirection(crownDirParam) ? crownDirParam : 'BTC-TAO';
  const crownGridRangeParam = params.get('crownGridRange');
  const crownGridRange: CrownRange = isCrownRange(crownGridRangeParam)
    ? crownGridRangeParam
    : '2h';
  const crownGridPan = parseInt(params.get('crownPan') ?? '600', 10) || 0;
  const crownFrom = parseBlockParam(params.get('crownFrom'));
  const crownTo = parseBlockParam(params.get('crownTo'));

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );
  const setParam = (key: string, value: string | undefined) =>
    updateParams({ [key]: value });

  const { data: stats } = useMinerStats(hotkey, range);
  const { data: miners } = useMiners();
  const liveMiner = miners?.find((m) => m.hotkey === hotkey) ?? null;
  const uid = stats?.uid ?? null;

  return (
    <Page title={`Miner ${uid ?? ''}`}>
      <SEO
        title={`Miner ${uid ?? shortHotkey(hotkey)}`}
        description={`Allways miner detail · uid ${uid ?? '?'} · ${shortHotkey(hotkey)}`}
      />
      <StickyNetworkHeader />
      <Stack
        sx={{
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography
            component={RouterLink}
            to="/miners"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              color: 'text.secondary',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { color: 'primary.main' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 14 }} /> Miners
          </Typography>
        </Stack>

        <MinerDetailHeader
          hotkey={hotkey}
          uid={uid}
          stats={stats}
          liveMiner={liveMiner}
          range={range}
          onRangeChange={(r) => setParam('range', r)}
        />

        {uid != null && (
          <CrownHistoryPanel
            hotkey={hotkey}
            lockedUid={uid}
            direction={crownDirection}
            onDirectionChange={(d) => setParam('crownDir', d)}
            range={crownGridRange}
            onRangeChange={(r) => setParam('crownGridRange', r)}
            pan={crownGridPan}
            onPanChange={(p) =>
              setParam('crownPan', p === 0 ? undefined : String(p))
            }
            customFrom={crownFrom}
            customTo={crownTo}
            onCustomRangeChange={(from, to) =>
              updateParams({
                crownFrom: from == null ? undefined : String(from),
                crownTo: to == null ? undefined : String(to),
              })
            }
          />
        )}

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <CrownRateChart
              range={rateRange}
              onRangeChange={(r) => setParam('rateRange', r)}
              minerHotkey={hotkey}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MinerSwapHistory hotkey={hotkey} />
          </Box>
        </Stack>
      </Stack>
    </Page>
  );
};

export default MinerDetailPage;
