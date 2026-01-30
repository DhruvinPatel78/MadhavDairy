import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import DataTable from "../Components/DataTable";
import Modal from "../Components/Modal";
import Input from "../Components/Input";
import moment from "moment";
import {
  FiDollarSign,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";

const CashManagement = () => {
  const [user, setUser] = useState(null);
  const [cashEntries, setCashEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showStartingCashModal, setShowStartingCashModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [startingCashAmount, setStartingCashAmount] = useState("");

  const [cashForm, setCashForm] = useState({
    type: "credit",
    amount: "",
    description: "",
    date: moment().format('YYYY-MM-DD'),
  });

  const [cashSummary, setCashSummary] = useState({
    startingCash: 0,
    totalSales: 0,
    totalExpenses: 0,
    totalCredits: 0,
    totalDebits: 0,
    endingCash: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchAllData();
      }
    });
    return () => unsubscribe();
  }, [dateFilter, customDate]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, dateFilter, customDate]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      let startDate, endDate;

      switch (dateFilter) {
        case "today":
          startDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
          );
          endDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
          );
          break;
        case "monthly":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          break;
        case "custom":
          if (!customDate) {
            return;
          } else {
            const selected = new Date(customDate);
            startDate = new Date(
              selected.getFullYear(),
              selected.getMonth(),
              selected.getDate(),
            );
            endDate = new Date(
              selected.getFullYear(),
              selected.getMonth(),
              selected.getDate() + 1,
            );
          }
          break;
        default:
          startDate = new Date(0);
          endDate = new Date();
      }

      // Fetch cash entries
      let cashData = [];
      try {
        const cashQuery = query(
          collection(db, "cashEntries"),
          where("timestamp", ">=", startDate),
          where("timestamp", "<", endDate),
          orderBy("timestamp", "desc"),
        );
        const cashSnapshot = await getDocs(cashQuery);
        cashData = cashSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        }));
      } catch (err) {
        console.log("No cash entries found or error:", err);
        // If no cash entries exist, continue with empty array
      }

      // Fetch sales (cash payments only)
      let salesData = [];
      try {
        const salesQuery = query(
          collection(db, "sales"),
          where("createdAt", ">=", startDate),
          where("createdAt", "<", endDate),
          where("paymentMode", "==", "cash"),
          orderBy("createdAt", "desc"),
        );
        const salesSnapshot = await getDocs(salesQuery);
        salesData = salesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().createdAt?.toDate(),
        }));
      } catch (err) {
        console.log("No cash sales found or error:", err);
      }

      // Fetch expenses (cash payments only)
      let expensesData = [];
      try {
        const expensesQuery = query(
          collection(db, "expenses"),
          where("timestamp", ">=", startDate),
          where("timestamp", "<", endDate),
          where("paymentMode", "==", "cash"),
          orderBy("timestamp", "desc"),
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        expensesData = expensesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        }));
      } catch (err) {
        console.log("No cash expenses found or error:", err);
      }

      setCashEntries(cashData);
      setSales(salesData);
      setExpenses(expensesData);

      // Calculate cash summary
      const totalSales = salesData.reduce(
        (sum, sale) => sum + (sale.paidAmount || 0),
        0,
      );
      const totalExpenses = expensesData.reduce(
        (sum, expense) => sum + (expense.amount || 0),
        0,
      );
      const totalCredits = cashData
        .filter((entry) => entry.type === "credit")
        .reduce((sum, entry) => sum + entry.amount, 0);
      const totalDebits = cashData
        .filter((entry) => entry.type === "debit")
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Get starting cash (previous day's ending balance or manual entry)
      const startingCash = await getStartingCash(startDate);
      const endingCash = startingCash + totalCredits - totalDebits;

      setCashSummary({
        startingCash,
        totalSales,
        totalExpenses,
        totalCredits,
        totalDebits,
        endingCash,
      });
    } catch (err) {
      setError("Failed to fetch cash data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStartingCash = async (date) => {
    try {
      const dateStr = moment(date).format('YYYY-MM-DD');
      const q = query(
        collection(db, "startingCash"),
        where("date", "==", dateStr)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data().amount || 0;
      }
    } catch (err) {
      console.error("Error fetching starting cash:", err);
    }
    return 0;
  };

  const handleSetStartingCash = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(startingCashAmount);
      const dateStr = moment().format('YYYY-MM-DD');
      
      await addDoc(collection(db, "startingCash"), {
        date: dateStr,
        amount,
        timestamp: new Date(),
        createdAt: new Date(),
      });

      setShowStartingCashModal(false);
      setStartingCashAmount("");
      fetchAllData();
    } catch (err) {
      console.error("Error setting starting cash:", err);
      setError("Failed to set starting cash");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const entryData = {
        ...cashForm,
        amount: parseFloat(cashForm.amount),
        timestamp: new Date(cashForm.date + "T00:00:00"),
        createdAt: editingEntry ? editingEntry.createdAt : new Date(),
        updatedAt: new Date(),
      };

      if (editingEntry) {
        await updateDoc(doc(db, "cashEntries", editingEntry.id), entryData);
      } else {
        await addDoc(collection(db, "cashEntries"), entryData);
      }

      setShowModal(false);
      setEditingEntry(null);
      setCashForm({
        type: "credit",
        amount: "",
        description: "",
        date: moment().format('YYYY-MM-DD'),
      });
      fetchAllData();
    } catch (err) {
      console.error("Error saving cash entry:", err);
      setError("Failed to save cash entry");
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setCashForm({
      type: entry.type,
      amount: entry.amount.toString(),
      description: entry.description || "",
      date: entry.timestamp ? moment(entry.timestamp).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
    });
    setShowModal(true);
  };

  const handleDelete = async (entryId) => {
    if (window.confirm("Are you sure you want to delete this cash entry?")) {
      try {
        await deleteDoc(doc(db, "cashEntries", entryId));
        fetchAllData();
      } catch (err) {
        console.error("Error deleting cash entry:", err);
        setError("Failed to delete cash entry");
      }
    }
  };

  // Combine all cash movements for display
  const allCashMovements = [
    ...cashEntries.map((entry) => ({
      ...entry,
      source: "manual",
      movementType: entry.type,
    })),
    ...sales.map((sale) => ({
      id: sale.id,
      timestamp: sale.timestamp,
      amount: sale.paidAmount,
      description: `Sale to ${sale.customerName}`,
      source: "sale",
      movementType: "credit",
    })),
    ...expenses.map((expense) => ({
      id: expense.id,
      timestamp: expense.timestamp,
      amount: expense.amount,
      description: `${expense.name} - ${expense.category}`,
      source: "expense",
      movementType: "debit",
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const columns = [
    {
      key: "timestamp",
      label: "Date & Time",
      render: (item) => item.timestamp ? moment(item.timestamp).format('DD/MM/YYYY HH:mm') : "N/A",
    },
    {
      key: "movementType",
      label: "Type",
      render: (item) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
            item.movementType === "credit"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.movementType === "credit" ? (
            <FiTrendingUp />
          ) : (
            <FiTrendingDown />
          )}
          {item.movementType === "credit" ? "Credit" : "Debit"}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (item) => (
        <span
          className={`font-medium ${
            item.movementType === "credit" ? "text-green-600" : "text-red-600"
          }`}
        >
          {item.movementType === "credit" ? "+" : "-"}₹
          {item.amount?.toFixed(2) || 0}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item) => item.description || "-"
    },
    {
      key: "source",
      label: "Source",
      render: (item) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            item.source === "manual"
              ? "bg-blue-100 text-blue-800"
              : item.source === "sale"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {item.source}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item) => {
        if (item.source === "manual") {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(item)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FiEdit />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-red-600 hover:text-red-800"
              >
                <FiTrash2 />
              </button>
            </div>
          );
        }
        return "-";
      },
    },
  ];

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/*<FiDollarSign className="text-2xl text-red-600" />*/}
            <h1 className="text-2xl font-semibold text-gray-900 !mb-0">
              Cash Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStartingCashModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FiDollarSign /> Set Starting Cash
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FiPlus /> Add Cash Entry
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Cash Summary */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Starting Cash</p>
            <p className="text-xl font-bold text-blue-800">
              ₹{cashSummary.startingCash.toFixed(2)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Sales (Cash)</p>
            <p className="text-xl font-bold text-green-800">
              ₹{cashSummary.totalSales.toFixed(2)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Credits</p>
            <p className="text-xl font-bold text-green-800">
              ₹{cashSummary.totalCredits.toFixed(2)}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 font-medium">Expenses</p>
            <p className="text-xl font-bold text-red-800">
              ₹{cashSummary.totalExpenses.toFixed(2)}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 font-medium">Debits</p>
            <p className="text-xl font-bold text-red-800">
              ₹{cashSummary.totalDebits.toFixed(2)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Ending Cash</p>
            <p className="text-xl font-bold text-purple-800">
              ₹{cashSummary.endingCash.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Filter
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="today">Today</option>
                <option value="monthly">This Month</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>

            {dateFilter === "custom" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={fetchAllData}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                <FiCalendar className="inline mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Cash Movements Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            data={allCashMovements}
            columns={columns}
            loading={loading}
            emptyMessage="No cash movements found for the selected period"
            renderRow={(item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            )}
          />
        </div>

        {/* Set Starting Cash Modal */}
        <Modal
          isOpen={showStartingCashModal}
          onClose={() => {
            setShowStartingCashModal(false);
            setStartingCashAmount("");
          }}
          title="Set Starting Cash"
        >
          <form onSubmit={handleSetStartingCash} className="space-y-4">
            <Input
              label="Starting Cash Amount"
              type="number"
              step="0.01"
              value={startingCashAmount}
              onChange={(e) => setStartingCashAmount(e.target.value)}
              placeholder="Enter starting cash amount"
              required
            />
            <p className="text-sm text-gray-600">
              This will set the starting cash for today ({moment().format('DD/MM/YYYY')})
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowStartingCashModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Set Starting Cash
              </button>
            </div>
          </form>
        </Modal>

        {/* Add/Edit Cash Entry Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingEntry(null);
            setCashForm({
              type: "credit",
              amount: "",
              description: "",
              date: moment().format('YYYY-MM-DD'),
            });
          }}
          title={editingEntry ? "Edit Cash Entry" : "Add Cash Entry"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={cashForm.type}
                onChange={(e) =>
                  setCashForm({ ...cashForm, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="credit">Credit (Money In)</option>
                <option value="debit">Debit (Money Out)</option>
              </select>
            </div>

            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={cashForm.amount}
              onChange={(e) =>
                setCashForm({ ...cashForm, amount: e.target.value })
              }
              required
            />

            <Input
              label="Date"
              type="date"
              value={cashForm.date}
              onChange={(e) =>
                setCashForm({ ...cashForm, date: e.target.value })
              }
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={cashForm.description}
                onChange={(e) =>
                  setCashForm({ ...cashForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Description of cash entry..."
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingEntry(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingEntry ? "Update" : "Add"} Entry
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default CashManagement;
