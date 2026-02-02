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
import ProductForm from "../components/ProductForm";
import DataTable from "../components/DataTable";
import moment from "moment";
import { FiArrowLeft, FiEdit, FiPackage, FiTrendingUp } from "react-icons/fi";

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [product, setProduct] = useState(null);
  const [stockUpdates, setStockUpdates] = useState([]);
  const [sells, setsells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("monthly");
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && productId) {
        fetchProductData();
      } else if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && productId) {
      fetchProductData();
    }
  }, [productId, dateFilter, customDate, user]);

  const fetchProductData = async () => {
    if (!user || !productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Fetch product details
      const productDoc = await getDoc(doc(db, "products", productId));
      if (!productDoc.exists()) {
        setError("Product not found");
        setLoading(false);
        return;
      }

      const productData = { id: productDoc.id, ...productDoc.data() };
      setProduct(productData);

      // Fetch stock updates
      const stockQuery = query(
        collection(db, "stockUpdates"),
        where("productId", "==", productId),
      );

      const stockSnapshot = await getDocs(stockQuery);
      let stockData = stockSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt:
          doc.data().createdAt?.toDate() || doc.data().timestamp?.toDate(),
      }));

      // Fetch sells containing this product
      const sellsQuery = query(collection(db, "sells"));
      const sellsSnapshot = await getDocs(sellsQuery);
      let sellsData = sellsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }))
        .filter((sell) =>
          sell.items?.some((item) => item.productId === productId),
        );

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
            setStockUpdates([]);
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

      // Filter and sort data
      stockData = stockData
        .filter((update) => {
          if (!update.createdAt) return false;
          return update.createdAt >= startDate && update.createdAt < endDate;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      sellsData = sellsData
        .filter((sell) => {
          if (!sell.createdAt) return false;
          return sell.createdAt >= startDate && sell.createdAt < endDate;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setStockUpdates(stockData);
      setsells(sellsData);
    } catch (err) {
      setError("Failed to fetch product data: " + err.message);
      console.error("Error fetching product data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (updatedData) => {
    try {
      await updateDoc(doc(db, "products", productId), {
        ...updatedData,
        updatedAt: new Date(),
      });
      setShowEditModal(false);
      fetchProductData();
    } catch (err) {
      setError("Failed to update product");
      console.error(err);
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity > 10)
      return { text: "In Stock", color: "bg-green-100 text-green-800" };
    if (quantity > 0)
      return { text: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Out of Stock", color: "bg-red-100 text-red-800" };
  };

  const stockColumns = [
    { key: "createdAt", header: "Date" },
    { key: "type", header: "Type" },
    { key: "quantity", header: "Quantity" },
    { key: "oldQuantity", header: "Old Stock" },
    { key: "newQuantity", header: "New Stock" },
    { key: "customerName", header: "Customer" },
  ];

  const renderStockRows = (update, index) => (
    <tr key={update.id || index} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">
        {update.createdAt
          ? moment(update.createdAt).format("DD/MM/YYYY HH:mm")
          : "N/A"}
      </td>
      <td className="px-6 py-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            update.type === "add"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {update.type === "add" ? "Stock Added" : "Stock Removed"}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
        {update.type === "add" ? "+" : "-"}
        {update.quantity || 0}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {update.oldQuantity || 0}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {update.newQuantity || 0}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {update.customerName || "N/A"}
      </td>
    </tr>
  );

  const sellsColumns = [
    { key: "createdAt", header: "Date" },
    { key: "customerName", header: "Customer" },
    { key: "quantity", header: "Quantity Sold" },
    { key: "totalAmount", header: "sell Amount" },
    { key: "paymentStatus", header: "Status" },
  ];

  const rendersellsRows = (sell, index) => {
    const productItem = sell.items?.find(
      (item) => item.productId === productId,
    );
    if (!productItem) return null;

    return (
      <tr key={sell.id || index} className="hover:bg-gray-50">
        <td className="px-6 py-4 text-sm text-gray-900">
          {sell.createdAt
            ? moment(sell.createdAt).format("DD/MM/YYYY HH:mm")
            : "N/A"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {sell.customerName || "N/A"}
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
          {productItem.quantity} {productItem.unit}
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
          ₹{productItem.totalPrice?.toFixed(2) || 0}
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
      </tr>
    );
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-500">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Product not found"}</p>
          <button
            onClick={() => navigate("/products")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const status = getStockStatus(product.quantity || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/products")}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-colors shadow-sm"
            >
              <FiArrowLeft className="text-xl" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Product Details
              </h1>
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <FiEdit className="text-lg" /> Edit Product
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Product Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FiPackage className="text-xl text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Product Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Product Name
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {product.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Unit
              </label>
              <p className="text-lg text-gray-900">{product.unit}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Price per Unit
              </label>
              <p className="text-lg font-semibold text-gray-900">
                ₹{product.pricePerUnit}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Current Stock
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {product.quantity || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Stock Status
              </label>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${status.color}`}
              >
                {status.text}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Product ID
              </label>
              <p className="text-sm text-gray-700">{product.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Created Date
              </label>
              <p className="text-sm text-gray-700">
                {product.createdAt?.toDate
                  ? moment(product.createdAt.toDate()).format("DD/MM/YYYY")
                  : "N/A"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Last Updated
              </label>
              <p className="text-sm text-gray-700">
                {product.updatedAt?.toDate
                  ? moment(product.updatedAt.toDate()).format("DD/MM/YYYY")
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Stock History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiTrendingUp className="text-xl text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Stock History
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
            data={stockUpdates}
            columns={stockColumns}
            renderRow={renderStockRows}
            emptyMessage="No stock updates found for the selected period"
          />
        </div>

        {/* sells History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <FiTrendingUp className="text-xl text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                sells History
              </h2>
            </div>
          </div>

          <DataTable
            data={sells}
            columns={sellsColumns}
            renderRow={rendersellsRows}
            emptyMessage="No sells found for the selected period"
          />
        </div>
      </div>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product"
      >
        <ProductForm
          product={product}
          onSave={handleUpdateProduct}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
};

export default ProductDetails;
