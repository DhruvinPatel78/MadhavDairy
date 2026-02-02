import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatTotalDue } from "../utils/formatters";
import { FormControlLabel, Switch } from '@mui/material';
import { Input, Button, Radio } from './';

const CustomerForm = ({ customer, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    isActive: true,
  });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        address: customer.address || "",
        isActive: customer.isActive !== false,
      });
    }
  }, [customer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setIsProcessingPayment(true);
    try {
      const amount = parseFloat(paymentAmount);
      const newTotalDue = (customer.totalDue || 0) - amount;
      
      await updateDoc(doc(db, "customers", customer.id), {
        totalDue: newTotalDue,
        updatedAt: new Date()
      });
      
      setPaymentAmount("");
      onSave(formData); // Refresh the customer data
    } catch (error) {
      console.error("Error processing payment:", error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Details Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Customer Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          multiline
          rows={3}
          required
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              color="success"
            />
          }
          label="Active Status"
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="outlined"
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
          >
            {customer ? "Update" : "Add"} Customer
          </Button>
        </div>
      </form>

      {/* Payment Due Section */}
      {customer && (customer.totalDue || 0) !== 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {formatTotalDue(customer.totalDue).status}
          </h3>
          <div className={`p-4 rounded-md mb-4 ${formatTotalDue(customer.totalDue).className.replace('text-', 'bg-').replace('-800', '-50')}`}>
            <p className={formatTotalDue(customer.totalDue).className.replace('bg-', 'text-').replace('-100', '-800')}>
              Amount: <span className="font-semibold">{formatTotalDue(customer.totalDue).amount}</span>
            </p>
          </div>
          
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Payment Amount"
                type="number"
                inputProps={{ step: "0.01" }}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <div className="flex gap-4">
                  <Radio
                    name="paymentMode"
                    value="cash"
                    checked={paymentMode === "cash"}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    label="Cash"
                  />
                  <Radio
                    name="paymentMode"
                    value="upi"
                    checked={paymentMode === "upi"}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    label="UPI"
                  />
                </div>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isProcessingPayment || !paymentAmount}
              variant="contained"
              color="success"
              fullWidth
            >
              {isProcessingPayment ? "Processing..." : "Record Payment"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerForm;
