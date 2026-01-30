import { Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./auth/ProtectedRoute";
import Products from "./pages/Products.jsx";
import Customers from "./pages/Customers.jsx";
import CustomerDetails from "./pages/CustomerDetails.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import SalesHistory from "./pages/SalesHistory.jsx";
import SalesInventoryManagement from "./pages/SalesInventoryManagement.jsx";
import InventoryHistory from "./pages/InventoryHistory.jsx";
import ExpensesManagement from "./pages/ExpensesManagement.jsx";
import CashManagement from "./pages/CashManagement.jsx";
import DashboardLayout from "./layout/DashboardLayout.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Products />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Customers />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:customerId"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CustomerDetails />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products/:productId"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProductDetails />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-history"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SalesHistory />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-inventory"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SalesInventoryManagement />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory-history"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <InventoryHistory />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ExpensesManagement />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cash-management"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CashManagement />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
