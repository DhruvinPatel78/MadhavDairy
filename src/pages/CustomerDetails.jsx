import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import Modal from "../components/Modal";
import CustomerForm from "../components/CustomerForm";
import DataTable from "../components/DataTable";
import moment from "moment";
import { FiArrowLeft, FiEdit, FiUser, FiShoppingBag } from "react-icons/fi";
import { formatTotalDue } from "../utils/formatters";

const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [sells, setsells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("monthly");
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && customerId) {
        fetchCustomerData();
      } else if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && customerId) {
      fetchCustomerData();
    }
  }, [customerId, dateFilter, customDate, user]);

  const fetchCustomerData = async () => {
    if (!user || !customerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Fetch customer details
      const customerDoc = await getDoc(doc(db, "customers", customerId));
      if (!customerDoc.exists()) {
        setError("Customer not found");
        setLoading(false);
        return;
      }

      const customerData = { id: customerDoc.id, ...customerDoc.data() };
      setCustomer(customerData);

      // Fetch all customer sells first, then filter by date
      const sellsQuery = query(
        collection(db, "sells"),
        where("customerId", "==", customerId),
      );

      const sellsSnapshot = await getDocs(sellsQuery);
      let sellsData = sellsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      // Filter by date on client side
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
            setsells([]);
            setLoading(false);
            return;
          }
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

      // Filter sells by date range and sort by date (newest first)
      sellsData = sellsData
        .filter((sell) => {
          if (!sell.createdAt) return false;
          return sell.createdAt >= startDate && sell.createdAt < endDate;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setsells(sellsData);
    } catch (err) {
      setError("Failed to fetch customer data: " + err.message);
      console.error("Error fetching customer data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async (updatedData) => {
    try {
      await updateDoc(doc(db, "customers", customerId), {
        ...updatedData,
        updatedAt: new Date(),
      });
      setShowEditModal(false);
      fetchCustomerData();
    } catch (err) {
      setError("Failed to update customer");
      console.error(err);
    }
  };

  const sellsColumns = [
    { key: "createdAt", header: "Date" },
    { key: "items", header: "Products" },
    { key: "totalAmount", header: "Total Amount" },
    { key: "paidAmount", header: "Paid Amount" },
    { key: "remainingAmount", header: "Remaining" },
    { key: "paymentStatus", header: "Status" },
    { key: "paymentMode", header: "Payment Mode" },
  ];

  const rendersellsRows = (sell, index) => (
    <tr key={sell.id || index} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">
        {sell.createdAt
          ? moment(sell.createdAt).format("DD/MM/YYYY HH:mm")
          : "N/A"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {sell.items?.length
          ? sell.items.map((item, index) => (
              <span key={index}>
                {item.productName} ({item.quantity} {item.unit})
                <br />
              </span>
            ))
          : "N/A"}
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
        ₹{sell.totalAmount?.toFixed(2) || 0}
      </td>
      <td className="px-6 py-4 text-sm text-green-600 font-semibold">
        ₹{sell.paidAmount?.toFixed(2) || 0}
      </td>
      <td className="px-6 py-4 text-sm text-red-600 font-semibold">
        ₹{sell.remainingAmount?.toFixed(2) || 0}
      </td>
      <td className="px-6 py-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            sell.paymentStatus === "paid"
              ? "bg-green-100 text-green-800"
              : sell.paymentStatus === "partial"
                ? "bg-yellow-100 text-yellow-800"
                : sell.paymentStatus === "overpaid"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-red-100 text-red-800"
          }`}
        >
          {sell.paymentStatus || "pending"}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
        {sell.paymentMode}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-500">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Customer not found"}</p>
          <button
            onClick={() => navigate("/customers")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/customers")}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-colors shadow-sm"
            >
              <FiArrowLeft className="text-xl" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Customer Details
              </h1>
              {/*<p className="text-sm text-gray-500">{customer.name}</p>*/}
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <FiEdit className="text-lg" /> Edit Customer
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Customer Personal Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FiUser className="text-xl text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Personal Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Name
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {customer.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Phone
              </label>
              <p className="text-lg text-gray-900">{customer.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Payment Status
              </label>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${formatTotalDue(customer.totalDue).className}`}
              >
                {formatTotalDue(customer.totalDue).status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Outstanding Amount
              </label>
              <p
                className={`text-lg font-semibold ${formatTotalDue(customer.totalDue).amountClassName}`}
              >
                {formatTotalDue(customer.totalDue).amount}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Address
            </label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
              {customer.address}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Customer Since
              </label>
              <p className="text-sm text-gray-700">
                {customer.createdAt?.toDate
                  ? moment(customer.createdAt.toDate()).format("DD/MM/YYYY")
                  : "N/A"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Last Updated
              </label>
              <p className="text-sm text-gray-700">
                {customer.updatedAt?.toDate
                  ? moment(customer.updatedAt.toDate()).format("DD/MM/YYYY")
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Purchase History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiShoppingBag className="text-xl text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Purchase History
                </h2>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-4">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="today">Today</option>
                  <option value="monthly">This Month</option>
                  <option value="custom">Custom Date</option>
                </select>

                {dateFilter === "custom" && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                )}
              </div>
            </div>
          </div>

          <DataTable
            data={sells}
            columns={sellsColumns}
            renderRow={rendersellsRows}
            emptyMessage="No purchases found for the selected period"
          />
        </div>
      </div>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Customer"
      >
        <CustomerForm
          customer={customer}
          onSave={handleUpdateCustomer}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
};

export default CustomerDetails;
