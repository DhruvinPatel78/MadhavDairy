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
import { Box, Grid, Alert } from '@mui/material';
import { PageHeader, StatCard, Button, Loading } from '../Components';
import moment from "moment";

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    customers: 0,
    todaysells: 0,
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

      // Get today's sells total
      const today = moment().startOf("day").toDate();
      const tomorrow = moment().add(1, "day").startOf("day").toDate();

      const todayQuery = query(
        collection(db, "sells"),
        where("createdAt", ">=", Timestamp.fromDate(today)),
        where("createdAt", "<", Timestamp.fromDate(tomorrow)),
      );

      const todaysellsSnap = await getDocs(todayQuery);
      const todaysellsTotal = todaysellsSnap.docs.reduce((total, doc) => {
        return total + (doc.data().totalPrice || 0);
      }, 0);

      // Get today's expenses total
      const expensesQuery = query(
        collection(db, "expenses"),
        where("timestamp", ">=", today),
        where("timestamp", "<", tomorrow),
      );
      const expensesSnap = await getDocs(expensesQuery);
      const todayExpensesTotal = expensesSnap.docs.reduce((total, doc) => {
        return total + (doc.data().amount || 0);
      }, 0);

      // Get today's cash sells and expenses for available cash calculation
      const cashsellsQuery = query(
        collection(db, "sells"),
        where("createdAt", ">=", Timestamp.fromDate(today)),
        where("createdAt", "<", Timestamp.fromDate(tomorrow)),
        where("paymentMode", "==", "cash"),
      );
      const cashsellsSnap = await getDocs(cashsellsQuery);
      const cashsellsTotal = cashsellsSnap.docs.reduce((total, doc) => {
        return total + (doc.data().paidAmount || 0);
      }, 0);

      const cashExpensesQuery = query(
        collection(db, "expenses"),
        where("timestamp", ">=", today),
        where("timestamp", "<", tomorrow),
        where("paymentMode", "==", "cash"),
      );
      const cashExpensesSnap = await getDocs(cashExpensesQuery);
      const cashExpensesTotal = cashExpensesSnap.docs.reduce((total, doc) => {
        return total + (doc.data().amount || 0);
      }, 0);

      // Get cash credits/debits
      const cashEntriesQuery = query(
        collection(db, "cashEntries"),
        where("timestamp", ">=", today),
        where("timestamp", "<", tomorrow),
      );
      const cashEntriesSnap = await getDocs(cashEntriesQuery);
      const cashCredits = cashEntriesSnap.docs
        .filter((doc) => doc.data().type === "credit")
        .reduce((total, doc) => total + (doc.data().amount || 0), 0);
      const cashDebits = cashEntriesSnap.docs
        .filter((doc) => doc.data().type === "debit")
        .reduce((total, doc) => total + (doc.data().amount || 0), 0);

      const availableCash =
        cashsellsTotal + cashCredits - cashExpensesTotal - cashDebits;

      setStats({
        products: productsCount,
        customers: customersCount,
        todaysells: todaysellsTotal,
        todayExpenses: todayExpensesTotal,
        availableCash: availableCash,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          Please log in to access dashboard.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <Box p={3}>
      <PageHeader 
        title="Dashboard" 
        actions={[
          <Button
            key="new-sell"
            onClick={() => navigate("/sells?openModal=true")}
            startIcon={<MdAdd />}
          >
            New Sell
          </Button>
        ]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Total Products"
            value={stats.products}
            icon={<MdInventory size={24} />}
            color="primary"
            onClick={() => navigate("/products")}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Total Customers"
            value={stats.customers}
            icon={<MdPeople size={24} />}
            color="info"
            onClick={() => navigate("/customers")}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Today's Sales"
            value={`₹${stats.todaysells}`}
            icon={<MdAttachMoney size={24} />}
            color="success"
            onClick={() => navigate("/sells-history")}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Today's Expenses"
            value={`₹${stats.todayExpenses}`}
            icon={<MdAttachMoney size={24} />}
            color="error"
            onClick={() => navigate("/expenses")}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Available Cash"
            value={`₹${stats.availableCash}`}
            icon={<MdAttachMoney size={24} />}
            color="warning"
            onClick={() => navigate("/cash-management")}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
