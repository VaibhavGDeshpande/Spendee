import {
  CreditCard,
  Banknote,
  Landmark,
  Wallet,
  PiggyBank,
  Coins,
  Building,
  Globe,
  GraduationCap,
  Briefcase,
  LucideIcon,
} from 'lucide-react';

export interface AccountIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const ACCOUNT_ICON_OPTIONS: AccountIconOption[] = [
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'credit-card', label: 'Card', icon: CreditCard },
  { id: 'banknote', label: 'Cash', icon: Banknote },
  { id: 'landmark', label: 'Bank / Blocked', icon: Landmark },
  { id: 'globe', label: 'Forex / Wise', icon: Globe },
  { id: 'piggy-bank', label: 'Savings', icon: PiggyBank },
  { id: 'coins', label: 'Coins', icon: Coins },
  { id: 'building', label: 'Institution', icon: Building },
  { id: 'graduation-cap', label: 'Education / Loan', icon: GraduationCap },
  { id: 'briefcase', label: 'Salary / Work', icon: Briefcase },
];

export function getAccountIconComponent(acc: { name: string; icon?: string | null }): LucideIcon {
  const name = acc.name.toLowerCase();
  const icon = acc.icon?.toLowerCase() || '';

  if (icon === 'credit-card' || name.includes('forex') || name.includes('card')) return CreditCard;
  if (icon === 'banknote' || name.includes('cash')) return Banknote;
  if (icon === 'landmark' || name.includes('blocked') || name.includes('bank')) return Landmark;
  if (icon === 'globe' || name.includes('wise') || name.includes('paypal') || name.includes('remit')) return Globe;
  if (icon === 'piggy-bank' || name.includes('sav')) return PiggyBank;
  if (icon === 'coins' || name.includes('coin')) return Coins;
  if (icon === 'building' || name.includes('n26') || name.includes('sparkasse') || name.includes('deutsche')) return Building;
  if (icon === 'graduation-cap' || name.includes('student') || name.includes('loan') || name.includes('scholarship')) return GraduationCap;
  if (icon === 'briefcase' || name.includes('job') || name.includes('salary') || name.includes('work')) return Briefcase;

  return Wallet;
}
