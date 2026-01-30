import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import Modal from "../components/Modal";
import Input from "../components/Input";
import SearchableDropdown from "../components/SearchableDropdown";
import { formatTotalDue } from "../utils/formatters";

const SalesInventoryManagement = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sales form state
  const [saleForm, setSaleForm] = useState({
    customerId: "",
    paymentMode: "cash",
    paidAmount: "",
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentProduct, setCurrentProduct] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");

  // Inventory management state
  const [newStock, setNewStock] = useState("");
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [customerDues, setCustomerDues] = useState({});
  const [dailyStats, setDailyStats] = useState({});
  const [addQuantities, setAddQuantities] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        customersSnapshot,
        productsSnapshot,
        salesSnapshot,
        stockUpdatesSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "customers")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "sales")),
        getDocs(collection(db, "stockUpdates")),
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

      // Calculate daily stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = {};
      const sales = salesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate today's sales
      sales.forEach((sale) => {
        const saleDate = sale.createdAt?.toDate?.() || new Date(sale.createdAt);
        if (saleDate >= today && saleDate < tomorrow) {
          sale.items?.forEach((item) => {
            if (!stats[item.productId]) {
              stats[item.productId] = { todaySales: 0, todayAdded: 0 };
            }
            stats[item.productId].todaySales += item.quantity || 0;
          });
        }
      });

      // Calculate today's stock additions
      const stockUpdates = stockUpdatesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      stockUpdates.forEach((update) => {
        const updateDate =
          update.createdAt?.toDate?.() || new Date(update.createdAt);
        if (
          updateDate >= today &&
          updateDate < tomorrow &&
          update.type === "add"
        ) {
          if (!stats[update.productId]) {
            stats[update.productId] = { todaySales: 0, todayAdded: 0 };
          }
          stats[update.productId].todayAdded += update.quantity || 0;
        }
      });

      setDailyStats(stats);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || selectedItems.length === 0) return;

    try {
      const totalAmount = selectedItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );
      const paidAmount = parseFloat(saleForm.paidAmount) || 0;
      const remainingAmount = totalAmount - paidAmount;

      // Create sale record with partial payment support
      const saleDoc = await addDoc(collection(db, "sales"), {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        items: selectedItems,
        totalAmount,
        paidAmount,
        remainingAmount: remainingAmount,
        paymentMode: saleForm.paymentMode,
        paymentStatus:
          remainingAmount > 0
            ? "partial"
            : remainingAmount < 0
              ? "overpaid"
              : "paid",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update customer's totalDue in database (handle prepayment and past dues)
      const currentDue = customerDues[selectedCustomer.id] || 0;
      const totalOwed = currentDue + totalAmount; // Total amount customer owes (past due + current bill)
      const finalBalance = totalOwed - paidAmount; // Final balance after payment

      await updateDoc(doc(db, "customers", selectedCustomer.id), {
        totalDue: finalBalance, // Can be negative for overpayment
        lastSaleDate: new Date(),
        updatedAt: new Date(),
      });

      // Update product quantities
      for (const item of selectedItems) {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          const newQuantity = (product.quantity || 0) - item.quantity;
          await updateDoc(doc(db, "products", item.productId), {
            quantity: Math.max(0, newQuantity),
          });

          // Add inventory history record for each sold item
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
            saleId: saleDoc.id,
            customerName: selectedCustomer.name,
          });
        }
      }

      // Add cash management entry if payment received
      if (paidAmount > 0) {
        await addDoc(collection(db, "cashManagement"), {
          type: "credit",
          amount: paidAmount,
          description: `Sale payment from ${selectedCustomer.name}`,
          paymentMode: saleForm.paymentMode,
          category: "sales",
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          saleId: saleDoc.id,
          createdAt: new Date(),
          timestamp: new Date(),
        });
      }

      // Reset form
      setSaleForm({ customerId: "", paymentMode: "cash", paidAmount: "" });
      setSelectedItems([]);
      setCurrentProduct("");
      setCurrentQuantity("");
      setSelectedCustomer(null);
      setSelectedProduct(null);
      fetchData();
    } catch (err) {
      setError("Failed to create sale");
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer);
    setSaleForm({ ...saleForm, customerId });

    // Recalculate customer dues when customer is selected
    const customerDue = customerDues[customerId] || 0;
    // This will trigger a re-render to show updated due amount
  };

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product);
    setCurrentProduct(productId);
  };

  const addProductToSale = () => {
    if (!selectedProduct || !currentQuantity) return;

    const quantity = parseFloat(currentQuantity);
    const totalPrice = selectedProduct.pricePerUnit * quantity;

    const newItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      unit: selectedProduct.unit,
      quantity,
      pricePerUnit: selectedProduct.pricePerUnit,
      totalPrice,
    };

    const updatedItems = [...selectedItems, newItem];
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    setSelectedItems(updatedItems);
    setSaleForm({ ...saleForm, paidAmount: newTotal.toString() });
    setCurrentProduct("");
    setCurrentQuantity("");
    setSelectedProduct(null);
  };

  const removeProductFromSale = (index) => {
    const updatedItems = selectedItems.filter((_, i) => i !== index);
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    setSelectedItems(updatedItems);
    setSaleForm({ ...saleForm, paidAmount: newTotal.toString() });
  };

  const handleStockUpdate = async () => {
    if (!stockProduct || !newStock) return;

    try {
      const oldQuantity = stockProduct.quantity || 0;
      const newQuantity = parseInt(newStock);
      const difference = newQuantity - oldQuantity;

      // Update product quantity
      await updateDoc(doc(db, "products", stockProduct.id), {
        quantity: newQuantity,
        updatedAt: new Date(),
      });

      // Record stock update in history
      if (difference !== 0) {
        await addDoc(collection(db, "stockUpdates"), {
          productId: stockProduct.id,
          productName: stockProduct.name,
          unit: stockProduct.unit,
          oldQuantity,
          newQuantity,
          quantity: Math.abs(difference),
          type: difference > 0 ? "add" : "remove",
          timestamp: new Date(),
          createdAt: new Date(),
        });
      }

      setShowStockModal(false);
      setStockProduct(null);
      setNewStock("");
      fetchData();
    } catch (err) {
      setError("Failed to update stock");
    }
  };

  const handleAddStock = async (productId) => {
    const addQuantity = addQuantities[productId];
    if (!addQuantity || parseFloat(addQuantity) <= 0) return;

    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const oldQuantity = product.quantity || 0;
      const addQty = parseFloat(addQuantity);
      const newQuantity = oldQuantity + addQty;

      // Update product quantity
      await updateDoc(doc(db, "products", productId), {
        quantity: newQuantity,
        updatedAt: new Date(),
      });

      // Record stock addition in history
      await addDoc(collection(db, "stockUpdates"), {
        productId,
        productName: product.name,
        unit: product.unit,
        oldQuantity,
        newQuantity,
        quantity: addQty,
        type: "add",
        timestamp: new Date(),
        createdAt: new Date(),
      });

      setAddQuantities((prev) => ({ ...prev, [productId]: "" }));
      fetchData();
    } catch (err) {
      setError("Failed to add stock");
    }
  };

  const openStockModal = (product) => {
    setStockProduct(product);
    setNewStock(product.quantity?.toString() || "0");
    setShowStockModal(true);
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          Please log in to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900 !mb-0">
          Sales & Inventory
        </h1>
        {/*<p className="text-sm text-gray-500 mt-1">*/}
        {/*  Manage sales and inventory in one place*/}
        {/*</p>*/}
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* First Row: Sales Form and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Sales Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              New Sale
            </h2>
            <form onSubmit={handleSaleSubmit} className="space-y-4">
              <SearchableDropdown
                label="Customer"
                options={customers.map((c) => ({ label: c.name, value: c.id }))}
                value={saleForm.customerId}
                onChange={(value) => handleCustomerSelect(value)}
                placeholder="Search and select customer"
                required
              />

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Add Products</h4>

                <div className="space-y-3">
                  <div className={"flex items-center justify-between gap-2"}>
                    <SearchableDropdown
                      label="Product"
                      options={products.map((p) => ({
                        label: `${p.name} (Available: ${p.quantity || 0})`,
                        value: p.id,
                      }))}
                      value={currentProduct}
                      onChange={(value) => handleProductSelect(value)}
                      placeholder="Search and select product"
                    />

                    <Input
                      label="Quantity"
                      type="number"
                      step="0.001"
                      value={currentQuantity}
                      mainClassName={"!w-1/3"}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                      placeholder="0.000"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addProductToSale}
                    disabled={!selectedProduct || !currentQuantity}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-3">
                    Selected Products
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-gray-50 p-2 rounded"
                      >
                        <div className="text-sm">
                          <span className="font-medium">
                            {item.productName}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {item.quantity} {item.unit} × ₹{item.pricePerUnit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            ₹{item.totalPrice}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeProductFromSale(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <p className="font-medium text-blue-900">
                      Total: ₹
                      {selectedItems
                        .reduce((sum, item) => sum + item.totalPrice, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <Input
                label="Payment Amount"
                type="number"
                value={saleForm.paidAmount}
                onChange={(e) => {
                  const amount = e.target.value;
                  setSaleForm({
                    ...saleForm,
                    paidAmount: amount,
                    paymentMode:
                      !amount || parseFloat(amount) === 0 ? "pending" : "cash",
                  });
                }}
                onWheel={(e) => e.target.blur()}
                placeholder="Enter payment amount"
              />

              {selectedItems.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span>Bill Amount:</span>
                    <span>
                      ₹
                      {selectedItems
                        .reduce((sum, item) => sum + item.totalPrice, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Past Due:</span>
                    <span
                      className={
                        customerDues[selectedCustomer?.id] > 0
                          ? "text-red-600"
                          : customerDues[selectedCustomer?.id] < 0
                            ? "text-blue-600"
                            : "text-gray-600"
                      }
                    >
                      {customerDues[selectedCustomer?.id] < 0
                        ? `₹${Math.abs(customerDues[selectedCustomer?.id]).toFixed(2)} (Credit)`
                        : `₹${Math.max(0, customerDues[selectedCustomer?.id] || 0).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-medium border-t pt-1 mt-1">
                    <span>Payable Amount:</span>
                    <span className="text-green-600 font-bold">
                      ₹
                      {Math.max(
                        0,
                        selectedItems.reduce(
                          (sum, item) => sum + item.totalPrice,
                          0,
                        ) +
                          Math.max(0, customerDues[selectedCustomer?.id] || 0),
                      ).toFixed(2)}
                    </span>
                  </div>
                  {saleForm.paidAmount && (
                    <>
                      <div className="flex justify-between text-sm border-t pt-1 mt-1">
                        <span>Paid Amount:</span>
                        <span>
                          ₹{parseFloat(saleForm.paidAmount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>
                          {parseFloat(saleForm.paidAmount || 0) >
                          Math.max(
                            0,
                            selectedItems.reduce(
                              (sum, item) => sum + item.totalPrice,
                              0,
                            ) +
                              Math.max(
                                0,
                                customerDues[selectedCustomer?.id] || 0,
                              ),
                          )
                            ? "Overpaid:"
                            : "Balance Due:"}
                        </span>
                        <span
                          className={
                            parseFloat(saleForm.paidAmount || 0) <
                            Math.max(
                              0,
                              selectedItems.reduce(
                                (sum, item) => sum + item.totalPrice,
                                0,
                              ) +
                                Math.max(
                                  0,
                                  customerDues[selectedCustomer?.id] || 0,
                                ),
                            )
                              ? "text-red-600"
                              : parseFloat(saleForm.paidAmount || 0) >
                                  Math.max(
                                    0,
                                    selectedItems.reduce(
                                      (sum, item) => sum + item.totalPrice,
                                      0,
                                    ) +
                                      Math.max(
                                        0,
                                        customerDues[selectedCustomer?.id] || 0,
                                      ),
                                  )
                                ? "text-blue-600"
                                : "text-green-600"
                          }
                        >
                          ₹
                          {Math.abs(
                            Math.max(
                              0,
                              selectedItems.reduce(
                                (sum, item) => sum + item.totalPrice,
                                0,
                              ) +
                                Math.max(
                                  0,
                                  customerDues[selectedCustomer?.id] || 0,
                                ),
                            ) - parseFloat(saleForm.paidAmount || 0),
                          ).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="cash"
                      checked={saleForm.paymentMode === "cash"}
                      disabled={parseFloat(saleForm.paidAmount || 0) === 0}
                      onChange={(e) =>
                        setSaleForm({
                          ...saleForm,
                          paymentMode: e.target.value,
                        })
                      }
                      className="mr-2 text-blue-600"
                    />
                    Cash
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="upi"
                      checked={saleForm.paymentMode === "upi"}
                      disabled={parseFloat(saleForm.paidAmount || 0) === 0}
                      onChange={(e) =>
                        setSaleForm({
                          ...saleForm,
                          paymentMode: e.target.value,
                        })
                      }
                      className="mr-2 text-blue-600"
                    />
                    UPI
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="pending"
                      checked={saleForm.paymentMode === "pending"}
                      onChange={(e) =>
                        setSaleForm({
                          ...saleForm,
                          paymentMode: e.target.value,
                          paidAmount:
                            e.target.value === "pending"
                              ? "0"
                              : saleForm.paidAmount,
                        })
                      }
                      className="mr-2 text-blue-600"
                    />
                    Pending
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                disabled={!selectedCustomer || selectedItems.length === 0}
              >
                Create Sale
              </button>
            </form>
          </div>

          {/* Customer and Product Details */}
          <div className="space-y-6">
            {/* Customer Details */}
            {selectedCustomer && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Customer Details
                </h3>
                <div className="space-y-2">
                  <div className={"flex items-center justify-between"}>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedCustomer.name}
                    </p>
                    <p>
                      <span className="font-medium">Mobile:</span>{" "}
                      {selectedCustomer.phone}
                    </p>
                  </div>
                  <div className={"flex items-center justify-between"}>
                    <p>
                      <span className="font-medium">Created:</span>{" "}
                      {selectedCustomer.createdAt
                        ?.toDate?.()
                        .toLocaleDateString() || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Past Due:</span>{" "}
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
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Product Details */}
            {selectedProduct && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Product Details
                </h3>
                <div className="space-y-2">
                  <div className={"flex items-center justify-between"}>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedProduct.name}
                    </p>
                    <p>
                      <span className="font-medium">Available:</span>{" "}
                      {selectedProduct.quantity || 0}
                    </p>
                  </div>
                  <div className={"flex items-center justify-between"}>
                    <p>
                      <span className="font-medium">Unit:</span>{" "}
                      {selectedProduct.unit}
                    </p>
                    <p>
                      <span className="font-medium">Price:</span> ₹
                      {selectedProduct.pricePerUnit}
                    </p>
                  </div>
                  <div className={"flex items-center justify-between"}>
                    <p>
                      <span className="font-medium">Today Added:</span>{" "}
                      <span className="text-green-600 font-semibold">
                        {dailyStats[selectedProduct.id]?.todayAdded || 0}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Today Sales:</span>{" "}
                      <span className="text-red-600 font-semibold">
                        {dailyStats[selectedProduct.id]?.todaySales || 0}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Inventory Management */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Inventory Management
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Today Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Today Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₹{product.pricePerUnit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {product.quantity || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">
                      +{dailyStats[product.id]?.todayAdded || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">
                      -{dailyStats[product.id]?.todaySales || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (product.quantity || 0) > 10
                            ? "bg-green-100 text-green-800"
                            : (product.quantity || 0) > 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {(product.quantity || 0) > 10
                          ? "In Stock"
                          : (product.quantity || 0) > 0
                            ? "Low Stock"
                            : "Out of Stock"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Add qty"
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                          mainClassName={"w-1/2"}
                          value={addQuantities[product.id] || ""}
                          onChange={(e) =>
                            setAddQuantities((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddStock(product.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddStock(product.id)}
                          disabled={
                            !addQuantities[product.id] ||
                            parseFloat(addQuantities[product.id]) <= 0
                          }
                          className="text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-xs font-medium px-2 py-1 rounded"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => openStockModal(product)}
                          className="text-white bg-blue-600 hover:bg-blue-700 text-xs font-medium px-2 py-1 rounded"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="text-white bg-gray-600 hover:bg-gray-700 text-xs font-medium px-2 py-1 rounded"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stock Update Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setStockProduct(null);
          setNewStock("");
        }}
        title="Update Stock"
      >
        {stockProduct && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                Product:{" "}
                <span className="font-medium">{stockProduct.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Current Stock:{" "}
                <span className="font-medium">
                  {stockProduct.quantity || 0}
                </span>
              </p>
            </div>

            <Input
              label="New Stock Quantity"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              min="0"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStockModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleStockUpdate}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Update Stock
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesInventoryManagement;
