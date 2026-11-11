export function formatCurrency(minorUnits) {
  if (minorUnits === undefined || minorUnits === null || isNaN(minorUnits)) {
    return '₹0.00';
  }
  const rupees = minorUnits / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rupees);
}

