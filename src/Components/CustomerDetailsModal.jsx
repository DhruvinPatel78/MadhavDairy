import { useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import Input from "./Input";

const CustomerDetailsModal = ({
  customer,
  customerDues = 0,
  onPaymentUpdate,
}) => {
  const [paymentAmount, setPaymentAmount] = useState(customerDues.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePaymentUpdate = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setIsUpdating(true);
    try {
      const amount = parseFloat(paymentAmount);

      // Get pending/partial sells for this customer
      const q = query(
        collection(db, "sells"),
        where("customerId", "==", customer.id),
      );
      const snapshot = await getDocs(q);

      let remainingPayment = amount;

      // Update sells from oldest to newest
      for (const docSnapshot of snapshot.docs) {
        if (remainingPayment <= 0) break;

        const sell = docSnapshot.data();
        const outstandingAmount =
          (sell.remainingAmount || sell.totalAmount || sell.totalPrice || 0) -
          (sell.paidAmount || 0);

        if (outstandingAmount <= 0) continue; // Skip fully paid sells

        const paymentForThissell = Math.min(
          remainingPayment,
          outstandingAmount,
        );
        const newPaidAmount = (sell.paidAmount || 0) + paymentForThissell;
        const newRemainingAmount =
          (sell.totalAmount || sell.totalPrice || 0) - newPaidAmount;

        await updateDoc(doc(db, "sells", docSnapshot.id), {
          paidAmount: newPaidAmount,
          remainingAmount: Math.max(0, newRemainingAmount),
          paymentStatus: newRemainingAmount <= 0 ? "paid" : "partial",
          updatedAt: new Date(),
        });

        remainingPayment -= paymentForThissell;
      }

      // Update customer's totalDue in database
      const newTotalDue = Math.max(0, customerDues - amount);
      await updateDoc(doc(db, "customers", customer.id), {
        totalDue: newTotalDue,
        lastPaymentDate: new Date(),
        updatedAt: new Date(),
      });

      if (onPaymentUpdate) {
        await onPaymentUpdate();
      }

      setPaymentAmount("");
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">
            Customer Name
          </label>
          <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">
            Payment Status
          </label>
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              customerDues > 0
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {customerDues > 0 ? "Payment Due" : "No Dues"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">
            Phone Number
          </label>
          <p className="text-lg text-gray-900">{customer.phone}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">
            Outstanding Amount
          </label>
          <p
            className={`text-lg font-semibold ${
              customerDues > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            ₹{customerDues}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500">
          Address
        </label>
        <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
          {customer.address}
        </p>
      </div>

      {customer.createdAt && (
        <div>
          <label className="block text-sm font-medium text-gray-500">
            Customer Since
          </label>
          <p className="text-sm text-gray-700">
            {customer.createdAt.toDate?.().toLocaleDateString() || "N/A"}
          </p>
        </div>
      )}

      {customerDues > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-3">Update Payment</h4>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
                max={customerDues}
              />
            </div>
            <button
              onClick={handlePaymentUpdate}
              disabled={
                !paymentAmount || parseFloat(paymentAmount) <= 0 || isUpdating
              }
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isUpdating ? "Updating..." : "Update Payment"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter any amount - can be less or more than ₹{customerDues}
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailsModal;
