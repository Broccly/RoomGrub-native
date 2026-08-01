import { formatAmount, formatCurrency, formatDate, formatMonthYear, formatShortDate } from './format';

describe('formatCurrency', () => {
  it('formats with rupee symbol and two decimals', () => {
    expect(formatCurrency(99)).toBe('₹99.00');
    expect(formatCurrency(99.5)).toBe('₹99.50');
    expect(formatCurrency(0)).toBe('₹0.00');
  });
});

describe('formatAmount', () => {
  it('formats absolute value as INR with no decimals', () => {
    expect(formatAmount(-1500)).toBe(formatAmount(1500));
    expect(formatAmount(0)).toContain('0');
  });
});

describe('formatDate', () => {
  it('renders a locale date string', () => {
    expect(formatDate('2026-07-01T00:00:00Z')).toEqual(
      new Date('2026-07-01T00:00:00Z').toLocaleDateString('en-IN'),
    );
  });
});

describe('formatShortDate', () => {
  it('renders day and short month', () => {
    expect(formatShortDate('2026-07-01T00:00:00Z')).toEqual(
      new Date('2026-07-01T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    );
  });
});

describe('formatMonthYear', () => {
  it('renders month and year', () => {
    expect(formatMonthYear('2026-07-01T00:00:00Z')).toEqual(
      new Date('2026-07-01T00:00:00Z').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    );
  });
});
