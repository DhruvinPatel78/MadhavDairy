import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { DataTable, SearchableDropdown, DateInput } from "../Components";
import NewSellModal from "../Components/NewSellModal.jsx";

const Sells = () => {
  const [sells, setsells] = useState([]);
  const [filteredsells, setFilteredsells] = useState([]);
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [showNewsellModal, setShowNewsellModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchsells();
    // Check if modal should be opened from URL parameter
    if (searchParams.get('openModal') === 'true') {
      setShowNewsellModal(true);
      // Remove the parameter from URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    filtersells();
  }, [sells, dateFilter, customDate]);

  const fetchsells = async () => {
    const q = query(collection(db, "sells"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    setsells(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    );
  };

  const filtersells = () => {
    const now = new Date();
    let filtered = [...sells];

    switch (dateFilter) {
      case "today":
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        filtered = sells.filter((sell) => {
          const sellDate =
            sell.createdAt?.toDate?.() || new Date(sell.createdAt);
          return sellDate >= today && sellDate < tomorrow;
        });
        break;
      case "monthly":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filtered = sells.filter((sell) => {
          const sellDate =
            sell.createdAt?.toDate?.() || new Date(sell.createdAt);
          return sellDate >= startOfMonth && sellDate <= endOfMonth;
        });
        break;
      case "custom":
        if (customDate) {
          const selectedDate = new Date(customDate);
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          filtered = sells.filter((sell) => {
            const sellDate =
              sell.createdAt?.toDate?.() || new Date(sell.createdAt);
            return sellDate >= selectedDate && sellDate < nextDay;
          });
        }
        break;
    }

    setFilteredsells(filtered);
  };

  const columns = [
    { header: "Date" },
    { header: "Customer" },
    { header: "Products" },
    { header: "Payment Status" },
    { header: "Total ₹" },
  ];

  const renderRow = (sell) => (
    <tr key={sell.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {sell.createdAt?.toDate?.().toLocaleDateString() ||
            new Date(sell.createdAt).toLocaleDateString()}
        </div>
        <div className="text-xs text-gray-500">
          {sell.createdAt?.toDate?.().toLocaleTimeString() ||
            new Date(sell.createdAt).toLocaleTimeString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {sell.customerName}
        </div>
      </td>
      <td className="px-6 py-4">
        {sell.items ? (
          <div className="text-sm text-gray-900">
            {sell.items.map((item, index) => (
              <div key={index} className="mb-1">
                {item.productName} ({item.quantity} {item.unit})
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-900">
            {sell.productName} ({sell.quantity} {sell.unit})
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            sell.paymentStatus === "partial"
              ? "bg-yellow-100 text-yellow-800"
              : sell.paymentStatus === "pending"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
          }`}
        >
          {sell.paymentStatus === "partial"
            ? "Partial"
            : sell.paymentStatus === "pending"
              ? "Pending"
              : "Paid"}
        </span>
        {sell.paymentStatus === "partial" && (
          <div className="text-xs text-gray-500 mt-1">
            Paid: ₹{sell.paidAmount} / ₹{sell.totalAmount}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-gray-900">
          ₹{sell.totalAmount || sell.totalPrice}
        </div>
      </td>
    </tr>
  );

  const totalAmount = filteredsells.reduce(
    (sum, sell) => sum + (sell.totalAmount || sell.totalPrice || 0),
    0,
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sells</h1>
          </div>
          <button
            onClick={() => setShowNewsellModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="text-lg">+</span>
            New Sell
          </button>
        </div>
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
            <DateInput
              label="Select Date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          )}

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-600">
              Total sells:{" "}
              <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
            </p>
            <p className="text-xs text-blue-500">
              {filteredsells.length} transactions
            </p>
          </div>
        </div>
      </div>

      <DataTable
        title={`sells Records - ${dateFilter === "today" ? "Today" : dateFilter === "monthly" ? "This Month" : "Custom Date"}`}
        columns={columns}
        data={filteredsells}
        renderRow={renderRow}
        emptyMessage="No sells found for selected period"
        itemsPerPage={15}
      />

      {/* New sell Modal */}
      <NewSellModal
        isOpen={showNewsellModal}
        onClose={() => setShowNewsellModal(false)}
        onsellCreated={() => {
          fetchsells();
          setShowNewsellModal(false);
        }}
      />
    </div>
  );
};

export default Sells;
