// Utility functions for formatting data

export const formatTotalDue = (totalDue) => {
  const amount = totalDue || 0;
  
  if (amount > 0) {
    return {
      status: "Payment Due",
      amount: `₹${amount.toFixed(2)}`,
      className: "bg-red-100 text-red-800",
      amountClassName: "text-red-600"
    };
  } else if (amount < 0) {
    return {
      status: "Credit/Pre-pay",
      amount: `₹${Math.abs(amount).toFixed(2)}`,
      className: "bg-blue-100 text-blue-800",
      amountClassName: "text-blue-600"
    };
  } else {
    return {
      status: "No Dues",
      amount: "₹0.00",
      className: "bg-green-100 text-green-800",
      amountClassName: "text-green-600"
    };
  }
};