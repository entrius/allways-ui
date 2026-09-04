import React from 'react';
import { Page, SEO } from '../components';
import RateMatrix from '../components/dashboard/RateMatrix';

// The market page IS the rate matrix: every route's live crown rate on one
// sheet, hubs as rows and every asset as a column. It replaced the
// single-instrument chart + orderbook terminal; the transactional side of
// the product (history, reservations, events) stays on /network.
const MarketPage: React.FC = () => (
  <Page title="Markets">
    <SEO
      title="Markets"
      description="Live cross-chain rates for every route on Allways — Bittensor SN7"
    />
    <RateMatrix />
  </Page>
);

export default MarketPage;
