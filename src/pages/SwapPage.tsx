import React, { useEffect, useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { Page, SEO } from '../components';
import {
  ClaimSlashedButton,
  RateChangedDialog,
  SwapDetails,
  SwapForm,
  SwapProgress,
} from '../components/swap';
import {
  ConnectWalletDialog,
  SubstrateOptionalBanner,
  useWallet,
} from '../wallet';
import { useSwapFlow, type SwapInputs } from '../hooks/useSwapFlow';
import { useSwapDetail } from '../api/SwapsApi';
import { FONTS } from '../theme';
import type { BestMinerResponse } from '../api/SwapApiClient';

const SwapPage: React.FC = () => {
  const { substrate, bitcoin } = useWallet();
  const [connectOpen, setConnectOpen] = useState(false);
  const [requireSubstrate, setRequireSubstrate] = useState(false);
  const [pendingInputs, setPendingInputs] = useState<SwapInputs | null>(null);
  const flow = useSwapFlow({ substrate, bitcoin });

  // Auto-confirm: once we reach `awaitingSend`, push directly through
  // sendAndConfirm so the wallet handles the BTC send popup. The state machine
  // pauses at `sending` if the user rejects in-wallet.
  useEffect(() => {
    if (flow.state.phase === 'awaitingSend') {
      void flow.sendAndConfirm();
    }
  }, [flow]);

  const handleSubmit = (input: SwapInputs) => {
    setPendingInputs(input);
    void flow.begin(input);
  };

  const onOpenConnect = (forSubstrate: boolean) => {
    setRequireSubstrate(forSubstrate);
    setConnectOpen(true);
  };

  const handleRateAccept = () => {
    if (!pendingInputs) return;
    // Carry forward inputs but with the new live rate the user just accepted.
    const actual = flow.state.rateChanged?.actual ?? pendingInputs.best.rate;
    const adjustedBest: BestMinerResponse = {
      ...pendingInputs.best,
      rate: actual,
    };
    flow.reset();
    void flow.begin({ ...pendingInputs, best: adjustedBest });
  };

  const watchSwapId = useMemo(() => {
    if (flow.state.swapId !== undefined) return String(flow.state.swapId);
    return '';
  }, [flow.state.swapId]);

  // Watch the active swap once we know its id — flips phase to `done` on COMPLETED.
  const swapDetail = useSwapDetail(watchSwapId);
  useEffect(() => {
    const status = swapDetail.data?.swap?.status;
    if (status === 'COMPLETED' && flow.state.phase === 'watching') {
      flow.markDone();
    }
  }, [swapDetail.data, flow]);

  const isTimedOut = swapDetail.data?.swap?.status === 'TIMED_OUT';

  return (
    <Page title="Exchange">
      <SEO
        title="Exchange"
        description="Exchange BTC ↔ TAO directly through Allways."
      />
      <Stack
        sx={{
          width: '100%',
          maxWidth: 480,
          mx: 'auto',
          px: 2,
          py: { xs: 4, md: 6 },
          flex: 1,
          gap: 2,
        }}
      >
        <SubstrateOptionalBanner />

        <SwapForm
          onSubmit={handleSubmit}
          disabled={
            flow.state.phase !== 'idle' &&
            flow.state.phase !== 'error' &&
            flow.state.phase !== 'done'
          }
          onOpenConnect={onOpenConnect}
        />

        {flow.state.phase !== 'idle' && (
          <SwapProgress phase={flow.state.phase} error={flow.state.error} />
        )}

        <SwapDetails best={pendingInputs?.best} state={flow.state} />

        {isTimedOut && flow.state.swapId !== undefined && (
          <ClaimSlashedButton swapId={String(flow.state.swapId)} />
        )}

        {(flow.state.phase === 'done' || flow.state.phase === 'error') && (
          <Button
            variant="outlined"
            onClick={() => {
              flow.reset();
              flow.clear();
              setPendingInputs(null);
            }}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              borderRadius: 0,
              alignSelf: 'flex-start',
            }}
          >
            New swap
          </Button>
        )}
      </Stack>

      <ConnectWalletDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        requireSubstrate={requireSubstrate}
      />

      <RateChangedDialog
        open={!!flow.state.rateChanged}
        data={flow.state.rateChanged}
        onAccept={handleRateAccept}
        onCancel={() => flow.reset()}
      />
    </Page>
  );
};

export default SwapPage;
