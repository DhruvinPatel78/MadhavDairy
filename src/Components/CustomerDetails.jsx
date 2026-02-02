import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";

const CustomerDetails = ({ customer, onBack }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({});

  useEffect(() => {
    fetchCustomerPurchases();
  }, [customer.id]);

  const fetchCustomerPurchases = async () => {
    try {
      setLoading(true);
      const sellsQuery = query(
        collection(db, "sells"),
        where("customerId", "==", customer.id),
        orderBy("createdAt", "desc"),
      );

      const sellsSnap = await getDocs(sellsQuery);
      const sellsData = sellsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      setPurchases(sellsData);
      calculateMonthlyStats(sellsData);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (sells) => {
    const stats = {};
    sells.forEach((sell) => {
      if (sell.createdAt) {
        const monthKey = `${sell.createdAt.getFullYear()}-${sell.createdAt.getMonth() + 1}`;
        if (!stats[monthKey]) {
          stats[monthKey] = {
            totalAmount: 0,
            totalQuantity: 0,
            products: {},
            cashPayments: 0,
            onlinePayments: 0,
          };
        }
        stats[monthKey].totalAmount += sell.totalPrice;
        stats[monthKey].totalQuantity += sell.quantity;

        if (!stats[monthKey].products[sell.productName]) {
          stats[monthKey].products[sell.productName] = 0;
        }
        stats[monthKey].products[sell.productName] += sell.quantity;

        // Use actual payment mode from sell data
        if (sell.paymentMode === "online") {
          stats[monthKey].onlinePayments += sell.totalPrice;
        } else {
          stats[monthKey].cashPayments += sell.totalPrice;
        }
      }
    });
    setMonthlyStats(stats);
  };

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading customer details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="bg-gray-500 text-white px-4 py-2 rounded mr-4"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold">Customer Details</h2>
      </div>

      {/* Customer Info */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="text-xl font-semibold">Customer Information</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Name:</strong> {customer.name}
            </div>
            <div>
              <strong>Phone:</strong> {customer.phone}
            </div>
            <div className="col-span-2">
              <strong>Address:</strong> {customer.address}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="text-xl font-semibold">Monthly Purchase Summary</h3>
        </div>
        <div className="card-body">
          {Object.keys(monthlyStats).length === 0 ? (
            <p className="text-gray-500">No purchases found</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(monthlyStats).map(([month, stats]) => (
                <div key={month} className="border rounded p-4">
                  <h4 className="font-semibold text-lg mb-2">
                    {formatMonth(month)}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Total Amount:</strong>
                      <br />₹{stats.totalAmount}
                    </div>
                    <div>
                      <strong>Total Quantity:</strong>
                      <br />
                      {stats.totalQuantity} units
                    </div>
                    <div>
                      <strong>Cash Payments:</strong>
                      <br />₹{stats.cashPayments}
                    </div>
                    <div>
                      <strong>Online Payments:</strong>
                      <br />₹{stats.onlinePayments}
                    </div>
                  </div>
                  <div className="mt-3">
                    <strong>Products Purchased:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(stats.products).map(([product, qty]) => (
                        <span key={product} className="badge badge-info">
                          {product}: {qty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Purchase History */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-xl font-semibold">Purchase History</h3>
        </div>
        <div className="card-body">
          {purchases.length === 0 ? (
            <p className="text-gray-500">No purchases found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.createdAt?.toLocaleDateString()}</td>
                      <td>{purchase.productName}</td>
                      <td>
                        {purchase.quantity} {purchase.unit}
                      </td>
                      <td>₹{purchase.pricePerUnit}</td>
                      <td>₹{purchase.totalPrice}</td>
                      <td>
                        <span
                          className={`badge ${purchase.paymentMode === "online" ? "badge-success" : "badge-info"}`}
                        >
                          {purchase.paymentMode || "Cash"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
