export function dollarsToCents(amount) {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid dollar amount: ${amount}`);
  }
  return Math.round(numeric * 100);
}

export function centsToDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

export function formatCurrency(cents) {
  return centsToDollars(cents).toFixed(2);
}
