import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  updateDoc,
  doc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { Modal, SearchableDropdown, Input, DateInput, Radio } from "./";
import CustomerForm from "./CustomerForm";
import { formatTotalDue } from "../utils/formatters.js";
import moment from "moment";

const NewSellModal = ({ isOpen, onClose, onsellCreated }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerDues, setCustomerDues] = useState({});
  const [dailyStats, setDailyStats] = useState({});

  const [sellForm, setsellForm] = useState({
    customerId: "",
    paymentMode: "cash",
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentProduct, setCurrentProduct] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [currentUnit, setCurrentUnit] = useState("");
  const [sellDate, setsellDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // const fetchData = async () => {
  //   try {
  //     const [customersSnapshot, productsSnapshot] = await Promise.all([
  //       getDocs(collection(db, "customers")),
  //       getDocs(collection(db, "products")),
  //     ]);
  //
  //     setCustomers(
  //       customersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  //     );
  //     setProducts(
  //       productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  //     );
  //   } catch (err) {
  //     console.error("Failed to load data:", err);
  //   }
  // };
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        customersSnapshot,
        productsSnapshot,
        dailyInventorySnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "customers")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "dailyInventory")),
      ]);

      setCustomers(
        customersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setProducts(
        productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );

      // Calculate customer dues from database (primary source)
      const dues = {};
      customersSnapshot.docs.forEach((doc) => {
        const customerData = doc.data();
        // Always use database totalDue value, can be positive (due) or negative (credit)
        dues[doc.id] = customerData.totalDue || 0;
      });

      setCustomerDues(dues);

      // Calculate daily stats from dailyInventory
      const stats = {};
      const today = moment().format("YYYY-MM-DD");
      
      dailyInventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date === today) {
          stats[data.productId] = {
            todayAdded: (data.newAdded || 0) + (data.previousRemaining || 0),
            todaysells: data.sold || 0,
            available: data.remainingQty || 0
          };
        }
      });

      setDailyStats(stats);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product);
    setCurrentProduct(productId);
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer);
    setsellForm({ ...sellForm, customerId });
  };

  const addProductTosell = () => {
    if (!selectedProduct || !currentQuantity) return;

    const quantity = parseFloat(currentQuantity);
    const totalPrice = selectedProduct.pricePerUnit * quantity;

    // Check if product already exists in selectedItems
    const existingItemIndex = selectedItems.findIndex(
      (item) =>
        item.productId === selectedProduct.id && item.unit === currentUnit,
    );

    if (existingItemIndex !== -1) {
      // Update existing item quantity and price
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].totalPrice =
        updatedItems[existingItemIndex].quantity * selectedProduct.pricePerUnit;
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        unit: currentUnit,
        quantity,
        pricePerUnit: selectedProduct.pricePerUnit,
        totalPrice,
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    setCurrentProduct("");
    setCurrentQuantity("");
    setCurrentUnit("");
    setSelectedProduct(null);
  };

  const updateItemQuantity = (index, newQuantity) => {
    if (!newQuantity || newQuantity.trim() === '') return;
    const quantity = parseFloat(newQuantity);
    if (quantity < 0.1) return;
    
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].totalPrice =
      updatedItems[index].quantity * updatedItems[index].pricePerUnit;
    setSelectedItems(updatedItems);
  };

  const removeProductFromsell = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handlesellSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    if (sellForm.paymentMode === "pending" && !selectedCustomer) return;

    try {
      const totalAmount = selectedItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );
      const paidAmount = sellForm.paymentMode === "pending" ? 0 : totalAmount;
      const remainingAmount = totalAmount - paidAmount;

      // Create sell record
      const sellDoc = await addDoc(collection(db, "sells"), {
        customerId:
          sellForm.paymentMode === "pending" ? selectedCustomer.id : null,
        customerName:
          sellForm.paymentMode === "pending"
            ? selectedCustomer.name
            : "Walk-in",
        items: selectedItems,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentMode: sellForm.paymentMode,
        paymentStatus:
          remainingAmount > 0
            ? "partial"
            : remainingAmount < 0
              ? "overpaid"
              : "paid",
        createdAt: new Date(sellDate),
        updatedAt: new Date(),
      });

      // Update customer dues if pending payment
      if (sellForm.paymentMode === "pending" && selectedCustomer) {
        const customerDoc = await getDocs(collection(db, "customers"));
        const customerData = customerDoc.docs
          .find((doc) => doc.id === selectedCustomer.id)
          ?.data();
        const currentDue = customerData?.totalDue || 0;
        const finalBalance = currentDue + remainingAmount;

        await updateDoc(doc(db, "customers", selectedCustomer.id), {
          totalDue: finalBalance,
          lastsellDate: new Date(),
          updatedAt: new Date(),
        });
      }

      // Update product quantities
      for (const item of selectedItems) {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          const newQuantity = (product.quantity || 0) - item.quantity;
          await updateDoc(doc(db, "products", item.productId), {
            quantity: Math.max(0, newQuantity),
          });

          // Update daily inventory sold quantity
          const today = moment().format("YYYY-MM-DD");
          const dailyInventoryQ = query(
            collection(db, "dailyInventory"),
            where("productId", "==", item.productId),
            where("date", "==", today)
          );
          const dailyInventorySnapshot = await getDocs(dailyInventoryQ);
          if (!dailyInventorySnapshot.empty) {
            const dailyInventoryDoc = dailyInventorySnapshot.docs[0];
            const currentData = dailyInventoryDoc.data();
            const newSold = (currentData.sold || 0) + item.quantity;
            const newRemaining = currentData.totalAvailable - newSold - (currentData.waste || 0);
            
            await updateDoc(doc(db, "dailyInventory", dailyInventoryDoc.id), {
              sold: newSold,
              remainingQty: Math.max(0, newRemaining)
            });
          } else {
            // Create daily inventory record if doesn't exist
            await addDoc(collection(db, "dailyInventory"), {
              productId: item.productId,
              productName: item.productName,
              date: today,
              previousRemaining: 0,
              newAdded: 0,
              totalAvailable: product.quantity || 0,
              sold: item.quantity,
              waste: 0,
              remainingQty: Math.max(0, (product.quantity || 0) - item.quantity),
              createdAt: new Date()
            });
          }

          // Add inventory history
          await addDoc(collection(db, "stockUpdates"), {
            productId: item.productId,
            productName: item.productName,
            unit: item.unit,
            oldQuantity: product.quantity || 0,
            newQuantity: Math.max(0, newQuantity),
            quantity: item.quantity,
            type: "remove",
            timestamp: new Date(),
            createdAt: new Date(),
            sellId: sellDoc.id,
            customerName:
              sellForm.paymentMode === "pending"
                ? selectedCustomer.name
                : "Walk-in",
          });
        }
      }

      // Add cash management entry if payment received
      if (paidAmount > 0) {
        await addDoc(collection(db, "cashManagement"), {
          type: "credit",
          amount: paidAmount,
          description: `sell payment from ${sellForm.paymentMode === "pending" ? selectedCustomer.name : "Walk-in"}`,
          paymentMode: sellForm.paymentMode,
          category: "sells",
          customerId:
            sellForm.paymentMode === "pending" ? selectedCustomer.id : null,
          customerName:
            sellForm.paymentMode === "pending"
              ? selectedCustomer.name
              : "Walk-in",
          sellId: sellDoc.id,
          createdAt: new Date(),
          timestamp: new Date(),
        });
      }

      handleClose();
      onsellCreated?.();
    } catch (err) {
      console.error("Failed to create sell:", err);
    }
  };

  const handleAddCustomer = async (customerData) => {
    try {
      const docRef = await addDoc(collection(db, "customers"), {
        ...customerData,
        totalDue: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newCustomer = { id: docRef.id, ...customerData };
      setCustomers([...customers, newCustomer]);
      setSelectedCustomer(newCustomer);
      setsellForm({ ...sellForm, customerId: newCustomer.id });
      setShowAddCustomerModal(false);
    } catch (err) {
      console.error("Failed to add customer:", err);
    }
  };

  const handleClose = () => {
    setsellForm({ customerId: "", paymentMode: "cash" });
    setSelectedItems([]);
    setCurrentProduct("");
    setCurrentQuantity("");
    setCurrentUnit("");
    setSelectedCustomer(null);
    setSelectedProduct(null);
    setsellDate(new Date().toISOString().split("T")[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="New sell" size={"sm"}>
        <div className={`flex flex-col gap-6`}>
          {/* Left Column - sells Form */}
          <div>
            <form onSubmit={handlesellSubmit} className="space-y-4">
              {/* sell Date */}
              <DateInput
                label="Sell Date"
                value={sellDate}
                onChange={(e) => setsellDate(e.target.value)}
              />

              {/* Products Section */}
              <div className={"flex flex-col gap-2"}>
                <label className="block text-sm font-medium text-gray-700">
                  Products
                </label>
                {/* Product Details */}
                {selectedProduct && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Product Details
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className={"flex gap-2"}>
                          <span className="font-medium">Name:</span>
                          <span className={"font-bold"}>
                            {selectedProduct.name}
                          </span>
                        </div>
                        <div className={"flex gap-2"}>
                          <span className="font-medium">Available:</span>
                          <span className={"font-bold"}>
                            {dailyStats[selectedProduct.id]?.available || selectedProduct.quantity || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <div className={"flex gap-2"}>
                          <span className="font-medium">Price:</span>
                          <span className={"font-bold"}>
                            ₹{selectedProduct.pricePerUnit}
                          </span>
                        </div>
                        <div className={"flex gap-2"}>
                          <span className="font-medium">Unit:</span>
                          <span className={"font-bold"}>
                            {selectedProduct.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <div className={"flex gap-2"}>
                          <span className="font-medium">Today Added:</span>
                          <span className="text-green-600 font-bold">
                            {dailyStats[selectedProduct.id]?.todayAdded || 0}
                          </span>
                        </div>
                        <div className={"flex gap-2"}>
                          <span className="font-medium">Today Sells:</span>
                          <span className="text-red-600 font-bold">
                            {dailyStats[selectedProduct.id]?.todaysells || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <SearchableDropdown
                    options={products.map((product) => ({
                      label: `${product.name} ( ${product.quantity || 0} )`,
                      value: product.id,
                    }))}
                    value={currentProduct}
                    onChange={(value) => {
                      handleProductSelect(value);
                      if (value) {
                        setCurrentQuantity("1");
                        const product = products.find((p) => p.id === value);
                        setCurrentUnit(product?.unit || "");
                      }
                    }}
                    placeholder="Select a product"
                  />

                  {selectedProduct && (
                    <div className="w-full flex gap-2">
                      <Input
                        type="number"
                        step="0.001"
                        value={currentQuantity}
                        onChange={(e) => setCurrentQuantity(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        mainClassName="w-1/2"
                      />
                      <SearchableDropdown
                        options={[
                          { label: "Liter", value: "Liter" },
                          { label: "Kg", value: "Kg" },
                          { label: "Piece", value: "Piece" },
                          { label: "Packet", value: "Packet" },
                        ]}
                        value={currentUnit}
                        onChange={setCurrentUnit}
                        placeholder="Unit"
                        mainClassName={"w-1/2"}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={addProductTosell}
                    disabled={!selectedProduct || !currentQuantity}
                    className="flex items-center gap-2 px-5 py-2.5 text-blue-600 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Product
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="flex gap-4">
                  <Radio
                    name="paymentMode"
                    value="cash"
                    checked={sellForm.paymentMode === "cash"}
                    onChange={(e) =>
                      setsellForm({
                        ...sellForm,
                        paymentMode: e.target.value,
                      })
                    }
                    label="Cash"
                  />
                  <Radio
                    name="paymentMode"
                    value="upi"
                    checked={sellForm.paymentMode === "upi"}
                    onChange={(e) =>
                      setsellForm({
                        ...sellForm,
                        paymentMode: e.target.value,
                      })
                    }
                    label="UPI"
                  />
                  <Radio
                    name="paymentMode"
                    value="pending"
                    checked={sellForm.paymentMode === "pending"}
                    onChange={(e) =>
                      setsellForm({
                        ...sellForm,
                        paymentMode: e.target.value,
                        paidAmount:
                          e.target.value === "pending"
                            ? "0"
                            : sellForm.paidAmount,
                      })
                    }
                    label="Pending"
                  />
                </div>
              </div>

              {/* Customer Selection - Only show if payment is pending */}
              {sellForm.paymentMode === "pending" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer
                  </label>
                  <div className="flex gap-2">
                    <SearchableDropdown
                      options={customers.map((c) => ({
                        label: c.name,
                        value: c.id,
                      }))}
                      value={sellForm.customerId}
                      onChange={handleCustomerSelect}
                      placeholder="Search and select customer"
                      required
                      mainClassName="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      className="px-5 py-2.5 text-blue-600 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  {selectedCustomer && (
                    <div className="bg-white p-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Past Due:</span>
                        <span
                          className={
                            formatTotalDue(customerDues[selectedCustomer.id])
                              .amountClassName
                          }
                        >
                          {formatTotalDue(customerDues[selectedCustomer.id])
                            .status === "Credit/Pre-pay"
                            ? `₹${Math.abs(customerDues[selectedCustomer.id] || 0).toFixed(2)} (Credit)`
                            : formatTotalDue(customerDues[selectedCustomer.id])
                                .amount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right Column - Billing Information */}
          {selectedItems.length > 0 ? (
            <div className="space-y-4">
              {/* Billing Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Billing Information
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded"
                    >
                      <div className="w-1/5 font-medium">
                        {item.productName}
                      </div>
                      <div className="w-1/2 flex items-center justify-center gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(index, e.target.value)
                          }
                          className="px-2 !py-0 border border-gray-300 rounded text-sm"
                          mainClassName={"w-1/4"}
                        />
                        <span className="text-gray-500">
                          {item.unit} × ₹{item.pricePerUnit}
                        </span>
                      </div>
                      <div className="w-1/5flex items-center gap-2">
                        <span className="font-medium">
                          ₹{item.totalPrice.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeProductFromsell(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold pt-4 border-t">
                <span>Total Amount:</span>
                <span className="text-blue-600">
                  ₹
                  {selectedItems
                    .reduce((sum, item) => sum + item.totalPrice, 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="flex justify-end space-x-3 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-gray-700 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlesellSubmit}
                  className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    selectedItems.length === 0 ||
                    (sellForm.paymentMode === "pending" && !selectedCustomer)
                  }
                >
                  Complete Sell
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8 font-bold">
              No items added yet
            </p>
          )}
        </div>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="Add New Customer"
      >
        <CustomerForm
          onSave={handleAddCustomer}
          onCancel={() => setShowAddCustomerModal(false)}
        />
      </Modal>
    </>
  );
};

export default NewSellModal;
