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
import SearchableDropdown from "../Components/SearchableDropdown";
import moment from "moment";
import {
  FiDollarSign,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCalendar,
} from "react-icons/fi";

const ExpensesManagement = () => {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [expenseForm, setExpenseForm] = useState({
    name: "",
    category: "",
    amount: "",
    paymentMode: "",
    description: "",
    date: moment().format('YYYY-MM-DD'),
  });

  const expenseCategories = [
    { label: "Supplies Purchase", value: "supplies" },
    { label: "Bill Payments", value: "bills" },
    { label: "Worker Salary", value: "salary" },
    { label: "Transportation", value: "transport" },
    { label: "Maintenance", value: "maintenance" },
    { label: "Marketing", value: "marketing" },
    { label: "Other", value: "other" },
  ];

  const paymentModes = [
    { label: "Cash", value: "cash" },
    { label: "Card", value: "card" },
    { label: "UPI", value: "upi" },
    { label: "Bank Transfer", value: "bank" },
    { label: "Cheque", value: "cheque" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchExpenses();
      }
    });
    return () => unsubscribe();
  }, [dateFilter, customDate]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, dateFilter, customDate]);

  const fetchExpenses = async () => {
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
          if (!customDate) return;
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
          break;
        default:
          startDate = new Date(0);
          endDate = new Date();
      }

      const q = query(
        collection(db, "expenses"),
        where("timestamp", ">=", startDate),
        where("timestamp", "<", endDate),
        orderBy("timestamp", "desc"),
      );

      const snapshot = await getDocs(q);
      const expensesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));

      setExpenses(expensesData);
    } catch (err) {
      setError("Failed to fetch expenses");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const expenseData = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        timestamp: new Date(expenseForm.date + "T00:00:00"),
        createdAt: editingExpense ? editingExpense.createdAt : new Date(),
        updatedAt: new Date()
      };

      if (editingExpense) {
        await updateDoc(doc(db, "expenses", editingExpense.id), expenseData);
      } else {
        await addDoc(collection(db, "expenses"), expenseData);
      }

      setShowModal(false);
      setEditingExpense(null);
      setExpenseForm({
        name: "",
        category: "",
        amount: "",
        paymentMode: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      fetchExpenses();
    } catch (err) {
      setError("Failed to save expense");
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      name: expense.name,
      category: expense.category,
      amount: expense.amount.toString(),
      paymentMode: expense.paymentMode,
      description: expense.description || "",
      date: expense.timestamp ? moment(expense.timestamp).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
    });
    setShowModal(true);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteDoc(doc(db, "expenses", expenseId));
        fetchExpenses();
      } catch (err) {
        setError("Failed to delete expense");
      }
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (!searchTerm) return true;
    return (
      expense.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.paymentMode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const columns = [
    {
      key: "timestamp",
      header: "Date",
    },
    {
      key: "name",
      header: "Expense Name",
    },
    {
      key: "category",
      header: "Category",
    },
    {
      key: "amount",
      header: "Amount",
    },
    {
      key: "paymentMode",
      header: "Payment Mode",
    },
    {
      key: "description",
      header: "Description",
    },
    {
      key: "actions",
      header: "Actions",
    },
  ];

  const renderRows = (expense, index) => (
    <tr key={expense.id || index} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">
        {expense.timestamp ? moment(expense.timestamp).format('DD/MM/YYYY') : "N/A"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {expense.name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {expenseCategories.find(c => c.value === expense.category)?.label || expense.category}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
        ₹{expense.amount?.toFixed(2) || 0}
      </td>
      <td className="px-6 py-4">
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {expense.paymentMode}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {expense.description || "-"}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(expense)}
            className="text-blue-600 hover:text-blue-800"
          >
            <FiEdit />
          </button>
          <button
            onClick={() => handleDelete(expense.id)}
            className="text-red-600 hover:text-red-800"
          >
            <FiTrash2 />
          </button>
        </div>
      </td>
    </tr>
  );

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
              Expenses Management
            </h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FiPlus /> Add Expense
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters and Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Filter
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <button
                onClick={fetchExpenses}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                <FiCalendar className="inline mr-2" />
                Refresh
              </button>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-red-800">
                ₹{totalExpenses.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            data={filteredExpenses}
            columns={columns}
            renderRow={renderRows}
            emptyMessage="No expenses found for the selected period"
          />
        </div>

        {/* Add/Edit Expense Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
            setExpenseForm({
              name: "",
              category: "",
              amount: "",
              paymentMode: "",
              description: "",
              date: new Date().toISOString().split("T")[0],
            });
          }}
          title={editingExpense ? "Edit Expense" : "Add New Expense"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Expense Name"
              value={expenseForm.name}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, name: e.target.value })
              }
              required
            />

            <SearchableDropdown
              label="Category"
              options={expenseCategories}
              value={expenseForm.category}
              onChange={(value) =>
                setExpenseForm({ ...expenseForm, category: value })
              }
              placeholder="Select category"
              required
            />

            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={expenseForm.amount}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, amount: e.target.value })
              }
              required
            />

            <SearchableDropdown
              label="Payment Mode"
              options={paymentModes}
              value={expenseForm.paymentMode}
              onChange={(value) =>
                setExpenseForm({ ...expenseForm, paymentMode: value })
              }
              placeholder="Select payment mode"
              required
            />

            <Input
              label="Date"
              type="date"
              value={expenseForm.date}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, date: e.target.value })
              }
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Optional description..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingExpense(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingExpense ? "Update" : "Add"} Expense
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default ExpensesManagement;
