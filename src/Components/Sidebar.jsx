import { NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {
  MdDashboard,
  MdInventory,
  MdPeople,
  MdPointOfSale,
  MdHistory,
  MdWarehouse,
  MdLogout,
  MdStore,
  MdAttachMoney,
  MdAccountBalance,
} from "react-icons/md";

const Sidebar = () => {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 p-2 mx-1 my-2.5 rounded-2xl text-gray-600 transition-colors ${
      isActive
        ? "bg-blue-500 text-white !hover:bg-blue-900 hover:text-white"
        : "hover:bg-gray-100 hover:text-blue-900"
    }`;

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <h2 className="font-bold text-center !text-blue-500 !mb-0">
            Madhav Dairy
          </h2>
          {/*<p className="text-xs text-gray-500">Admin Panel</p>*/}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <NavLink to="/" className={linkClass}>
          <MdDashboard className="text-lg" />
          Dashboard
        </NavLink>
        <NavLink to="/products" className={linkClass}>
          <MdInventory className="text-lg" />
          Products
        </NavLink>
        <NavLink to="/customers" className={linkClass}>
          <MdPeople className="text-lg" />
          Customers
        </NavLink>
        <NavLink to="/sales-inventory" className={linkClass}>
          <MdStore className="text-lg" />
          Sales & Inventory
        </NavLink>
        <NavLink to="/sales-history" className={linkClass}>
          <MdHistory className="text-lg" />
          Sales History
        </NavLink>
        <NavLink to="/inventory-history" className={linkClass}>
          <MdWarehouse className="text-lg" />
          Inventory History
        </NavLink>
        <NavLink to="/expenses" className={linkClass}>
          <MdAttachMoney className="text-lg" />
          Expenses
        </NavLink>
        <NavLink to="/cash-management" className={linkClass}>
          <MdAccountBalance className="text-lg" />
          Cash Management
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => {
            signOut(auth);
            localStorage.removeItem('madhavDairyUser');
          }}
          className="flex items-center gap-3 rounded-2xl w-full p-4 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <MdLogout className="text-lg" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
