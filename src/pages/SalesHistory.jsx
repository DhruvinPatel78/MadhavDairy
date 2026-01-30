import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import DataTable from "../Components/DataTable";
import SearchableDropdown from "../Components/SearchableDropdown";

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, dateFilter, customDate]);

  const fetchSales = async () => {
    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    setSales(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    );
  };

  const filterSales = () => {
    const now = new Date();
    let filtered = [...sales];

    switch (dateFilter) {
      case "today":
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        filtered = sales.filter((sale) => {
          const saleDate =
            sale.createdAt?.toDate?.() || new Date(sale.createdAt);
          return saleDate >= today && saleDate < tomorrow;
        });
        break;
      case "monthly":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filtered = sales.filter((sale) => {
          const saleDate =
            sale.createdAt?.toDate?.() || new Date(sale.createdAt);
          return saleDate >= startOfMonth && saleDate <= endOfMonth;
        });
        break;
      case "custom":
        if (customDate) {
          const selectedDate = new Date(customDate);
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          filtered = sales.filter((sale) => {
            const saleDate =
              sale.createdAt?.toDate?.() || new Date(sale.createdAt);
            return saleDate >= selectedDate && saleDate < nextDay;
          });
        }
        break;
    }

    setFilteredSales(filtered);
  };

  const columns = [
    { header: "Date" },
    { header: "Customer" },
    { header: "Products" },
    { header: "Payment Status" },
    { header: "Total ₹" },
  ];

  const renderRow = (sale) => (
    <tr key={sale.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {sale.createdAt?.toDate?.().toLocaleDateString() ||
            new Date(sale.createdAt).toLocaleDateString()}
        </div>
        <div className="text-xs text-gray-500">
          {sale.createdAt?.toDate?.().toLocaleTimeString() ||
            new Date(sale.createdAt).toLocaleTimeString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {sale.customerName}
        </div>
      </td>
      <td className="px-6 py-4">
        {sale.items ? (
          <div className="text-sm text-gray-900">
            {sale.items.map((item, index) => (
              <div key={index} className="mb-1">
                {item.productName} ({item.quantity} {item.unit})
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-900">
            {sale.productName} ({sale.quantity} {sale.unit})
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            sale.paymentStatus === "partial"
              ? "bg-yellow-100 text-yellow-800"
              : sale.paymentStatus === "pending"
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {sale.paymentStatus === "partial" ? "Partial" : 
           sale.paymentStatus === "pending" ? "Pending" : "Paid"}
        </span>
        {sale.paymentStatus === "partial" && (
          <div className="text-xs text-gray-500 mt-1">
            Paid: ₹{sale.paidAmount} / ₹{sale.totalAmount}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-gray-900">
          ₹{sale.totalAmount || sale.totalPrice}
        </div>
      </td>
    </tr>
  );

  const totalAmount = filteredSales.reduce(
    (sum, sale) => sum + (sale.totalAmount || sale.totalPrice || 0),
    0,
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        {/*<p className="text-gray-600">View sales transactions with date filters</p>*/}
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <SearchableDropdown
            label="Filter by Date"
            options={[
              { label: "Today", value: "today" },
              { label: "This Month", value: "monthly" },
              { label: "Custom Date", value: "custom" },
            ]}
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="Select date filter"
          />

          {dateFilter === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-600">
              Total Sales:{" "}
              <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
            </p>
            <p className="text-xs text-blue-500">
              {filteredSales.length} transactions
            </p>
          </div>
        </div>
      </div>

      <DataTable
        title={`Sales Records - ${dateFilter === "today" ? "Today" : dateFilter === "monthly" ? "This Month" : "Custom Date"}`}
        columns={columns}
        data={filteredSales}
        renderRow={renderRow}
        emptyMessage="No sales found for selected period"
        itemsPerPage={15}
      />
    </div>
  );
};

export default SalesHistory;
