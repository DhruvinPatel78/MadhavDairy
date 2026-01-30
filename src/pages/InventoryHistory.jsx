import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import DataTable from "../Components/DataTable";
import { FiCalendar, FiPackage } from "react-icons/fi";

const InventoryHistory = () => {
  const [user, setUser] = useState(null);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchInventoryHistory();
      }
    });
    return () => unsubscribe();
  }, [dateFilter, customDate]);

  useEffect(() => {
    if (user) {
      fetchInventoryHistory();
    }
  }, [user, dateFilter, customDate]);

  const fetchInventoryHistory = async () => {
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

      // Fetch stock updates
      const stockQuery = query(
        collection(db, "stockUpdates"),
        where("timestamp", ">=", startDate),
        where("timestamp", "<", endDate),
        orderBy("timestamp", "desc"),
      );

      const stockSnapshot = await getDocs(stockQuery);
      const stockUpdates = stockSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "stock_add",
        timestamp: doc.data().timestamp?.toDate(),
      }));

      // Fetch sales for stock deductions
      const salesQuery = query(
        collection(db, "sales"),
        where("timestamp", ">=", startDate),
        where("timestamp", "<", endDate),
        orderBy("timestamp", "desc"),
      );

      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "stock_sell",
        timestamp: doc.data().timestamp?.toDate(),
      }));

      // Combine and sort all inventory movements
      const allMovements = [...stockUpdates, ...salesData].sort(
        (a, b) => b.timestamp - a.timestamp,
      );

      setInventoryHistory(allMovements);
    } catch (err) {
      setError("Failed to fetch inventory history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = inventoryHistory.filter((item) => {
    if (!searchTerm) return true;
    return (
      item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const columns = [
    {
      key: "timestamp",
      header: "Date & Time",
    },
    {
      key: "type",
      header: "Type",
    },
    {
      key: "productName",
      header: "Product",
    },
    {
      key: "addedQty",
      header: "Added Qty",
    },
    {
      key: "soldQty",
      header: "Sold Qty",
    },
    {
      key: "availableQty",
      header: "Available Qty",
    },
    {
      key: "unit",
      header: "Unit",
    },
    {
      key: "reference",
      header: "Reference",
    },
  ];

  const renderRows = (item, index) => (
    <tr key={item.id || index} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">
        {item.timestamp?.toLocaleString() || "N/A"}
      </td>
      <td className="px-6 py-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.type === "stock_add"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.type === "stock_add" ? "Stock Added" : "Stock Sold"}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {item.productName || "N/A"}
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-green-600">
        {item.type === "stock_add" 
          ? (item.quantity || 0)
          : "-"
        }
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-red-600">
        {item.type === "stock_sell" 
          ? (item.items?.reduce((sum, product) => sum + product.quantity, 0) || 0)
          : "-"
        }
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-blue-600">
        {item.newQuantity || item.availableQuantity || "-"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {item.unit || "N/A"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {item.type === "stock_add" 
          ? "Stock Update" 
          : `Sale to ${item.customerName || "Unknown"}`
        }
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
        <div className="flex items-center gap-3">
          {/*<FiPackage className="text-2xl text-red-600" />*/}
          <h1 className="text-2xl font-semibold text-gray-900 !mb-0">
            Inventory History
          </h1>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

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
                placeholder="Search by product or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchInventoryHistory}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                <FiCalendar className="inline mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Inventory History Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            data={filteredHistory}
            columns={columns}
            renderRow={renderRows}
            emptyMessage="No inventory movements found for the selected period"
          />
        </div>
      </div>
    </div>
  );
};

export default InventoryHistory;
