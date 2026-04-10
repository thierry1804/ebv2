import type { MobileMoneyOperator } from '../types';

export const MOBILE_MONEY_OPERATORS: Record<
  MobileMoneyOperator,
  { label: string; numberDisplay: string }
> = {
  mvola: {
    label: 'MVola',
    numberDisplay: '+261 38 42 711 68',
  },
  orange: {
    label: 'Orange Money',
    numberDisplay: '+261 32 22 136 82',
  },
  airtel: {
    label: 'Airtel Money',
    numberDisplay: '+261 33 64 554 78',
  },
};

export const MOBILE_MONEY_OPERATOR_IDS: MobileMoneyOperator[] = ['mvola', 'orange', 'airtel'];

export function isMobileMoneyOperator(v: string): v is MobileMoneyOperator {
  return v === 'mvola' || v === 'orange' || v === 'airtel';
}

export function formatMobileMoneyPaymentSummary(
  operator: MobileMoneyOperator | undefined,
  reference: string | undefined
): string {
  if (!operator) return 'Mobile Money';
  const o = MOBILE_MONEY_OPERATORS[operator];
  const ref = reference?.trim();
  if (ref) return `${o.label} — réf. ${ref}`;
  return o.label;
}
