export const formatCurrency = (amount: number): string => {
  return `₹${parseFloat(String(amount)).toFixed(2)}`;
};

export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN');
};

export const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

export const formatMonthYear = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
