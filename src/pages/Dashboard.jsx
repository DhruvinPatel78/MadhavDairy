import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { MdInventory, MdPeople, MdAttachMoney, MdAdd } from "react-icons/md";
import moment from "moment";

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    customers: 0,
    todaySales: 0,
    todayExpenses: 0,
    availableCash: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchStats();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get products count
      const productsSnap = await getDocs(collection(db, "products"));
      const productsCount = productsSnap.size;

      // Get customers count
      const customersSnap = await getDocs(collection(db, "customers"));
      const customersCount = customersSnap.size;

      // Get today's sales total
      const today = moment().startOf('day').toDate();
      const tomorrow = moment().add(1, 'day').startOf('day').toDate();

      const todayQuery = query(
        collection(db, "sales"),
        where("createdAt", ">=", Timestamp.fromDate(today)),
        where("createdAt", "<", Timestamp.fromDate(tomorrow)),
      );

      const todaySalesSnap = await getDocs(todayQuery);
      const todaySalesTotal = todaySalesSnap.docs.reduce((total, doc) => {
        return total + (doc.data().totalPrice || 0);
      }, 0);

      // Get today's expenses total
      const expensesQuery = query(
        collection(db, "expenses"),
        where("timestamp", ">=", today),
        where("timestamp", "<", tomorrow)
      );
      const expensesSnap = await getDocs(expensesQuery);
      const todayExpensesTotal = expensesSnap.docs.reduce((total, doc) => {
        return total + (doc.data().amount || 0);
      }, 0);

      // Get today's cash sales and expenses for available cash calculation
      const cashSalesQuery = query(
        collection(db, "sales"),
        where("createdAt", ">=", Timestamp.fromDate(today)),
        where("createdAt", "<", Timestamp.fromDate(tomorrow)),
        where("paymentMode", "==", "cash")
      );
      const cashSalesSnap = await getDocs(cashSalesQuery);
      const cashSalesTotal = cashSalesSnap.docs.reduce((total, doc) => {
        return total + (doc.data().paidAmount || 0);
      }, 0);

      const cashExpensesQuery = query(
        collection(db, "expenses"),
        where("timestamp", ">=", today),
        where("timestamp", "<", tomorrow),
        where("paymentMode", "==", "cash")
      );
      const cashExpensesSnap = await getDocs(cashExpensesQuery);
      const cashExpensesTotal = cashExpensesSnap.docs.reduce((total, doc) => {
        return total + (doc.data().amount || 0);
      }, 0);

      // Get cash credits/debits
      const cashEntriesQuery = query(
        collection(db, "cashEntries"),
        where("timestamp", ">=", today),
        where("timestamp", "<", tomorrow)
      );
      const cashEntriesSnap = await getDocs(cashEntriesQuery);
      const cashCredits = cashEntriesSnap.docs
        .filter(doc => doc.data().type === "credit")
        .reduce((total, doc) => total + (doc.data().amount || 0), 0);
      const cashDebits = cashEntriesSnap.docs
        .filter(doc => doc.data().type === "debit")
        .reduce((total, doc) => total + (doc.data().amount || 0), 0);

      const availableCash = cashSalesTotal + cashCredits - cashExpensesTotal - cashDebits;

      setStats({
        products: productsCount,
        customers: customersCount,
        todaySales: todaySalesTotal,
        todayExpenses: todayExpensesTotal,
        availableCash: availableCash
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          Please log in to access dashboard.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => navigate("/sales-inventory")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <span>+</span>
          New Sale
        </button>
      </div>

      <div className="stats-grid">
        <div
          className="stat-card hover-lift cursor-pointer"
          onClick={() => navigate("/products")}
        >
          <div className={"flex items-center justify-between"}>
            <div className="stat-header">
              <div className="stat-icon">
                <MdInventory className="text-2xl" />
              </div>
            </div>
            <div className="stat-number">{stats.products}</div>
          </div>
          <div className="stat-label">Total Products</div>
        </div>

        <div
          className="stat-card hover-lift cursor-pointer"
          onClick={() => navigate("/customers")}
        >
          <div className={"flex items-center justify-between"}>
            <div className="stat-header">
              <div className="stat-icon">
                <MdPeople className="text-2xl" />
              </div>
            </div>
            <div className="stat-number">{stats.customers}</div>
          </div>
          <div className="stat-label">Total Customers</div>
        </div>

        <div
          className="stat-card hover-lift cursor-pointer"
          onClick={() => navigate("/sales-history")}
        >
          <div className={"flex items-center justify-between"}>
            <div className="stat-header">
              <div className="stat-icon">
                <MdAttachMoney className="text-2xl" />
              </div>
            </div>
            <div className="stat-number">₹{stats.todaySales}</div>
          </div>
          <div className="stat-label">Today's Sales</div>
        </div>

        <div
          className="stat-card hover-lift cursor-pointer"
          onClick={() => navigate("/expenses")}
        >
          <div className={"flex items-center justify-between"}>
            <div className="stat-header">
              <div className="stat-icon">
                <MdAttachMoney className="text-2xl" style={{color: '#dc2626'}} />
              </div>
            </div>
            <div className="stat-number">₹{stats.todayExpenses}</div>
          </div>
          <div className="stat-label">Today's Expenses</div>
        </div>

        <div
          className="stat-card hover-lift cursor-pointer"
          onClick={() => navigate("/cash-management")}
        >
          <div className={"flex items-center justify-between"}>
            <div className="stat-header">
              <div className="stat-icon">
                <MdAttachMoney className="text-2xl" style={{color: '#059669'}} />
              </div>
            </div>
            <div className="stat-number">₹{stats.availableCash}</div>
          </div>
          <div className="stat-label">Available Cash</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
