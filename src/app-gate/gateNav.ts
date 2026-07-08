import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export interface GateNavItem {
  label: string;
  to: string;
  icon: SvgIconComponent;
  // Requires an active membership — guarded routes redirect non-members to /app.
  gated: boolean;
  comingSoon?: boolean;
}

export const GATE_BASE = '/app';

export const GATE_NAV: GateNavItem[] = [
  {
    label: 'Overview',
    to: '/app/overview',
    icon: GridViewOutlinedIcon,
    gated: true,
  },
  {
    label: 'Exchange',
    to: '/app/exchange',
    icon: SwapHorizOutlinedIcon,
    gated: true,
  },
  {
    label: 'Swaps',
    to: '/app/swaps',
    icon: ReceiptLongOutlinedIcon,
    gated: true,
  },
  {
    label: 'Wallets',
    to: '/app/wallets',
    icon: AccountBalanceWalletOutlinedIcon,
    gated: true,
  },
  {
    label: 'Limits',
    to: '/app/limits',
    icon: TuneOutlinedIcon,
    gated: true,
    comingSoon: true,
  },
  {
    label: 'Billing',
    to: '/app/billing',
    icon: PaymentsOutlinedIcon,
    gated: true,
  },
];
