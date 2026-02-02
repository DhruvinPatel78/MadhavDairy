import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import DataTable from "../Components/DataTable";
import Modal from "../Components/Modal";
import { Input, Button, Select, Checkbox } from "../Components";
import {
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
} from "@mui/material";
import { FiUsers, FiPlus, FiEdit, FiTrash2, FiSettings } from "react-icons/fi";

const Users = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingUserType, setEditingUserType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [userForm, setUserForm] = useState({
    name: "",
    mobile: "",
    email: "",
    username: "",
    password: "",
    address: "",
    userType: "",
    userPay: "",
    isActive: true,
  });

  const [userTypeForm, setUserTypeForm] = useState({
    userType: "",
    isActive: true,
    pages: [],
  });

  const availablePages = [
    { id: "dashboard", name: "Dashboard" },
    { id: "products", name: "Products" },
    { id: "customers", name: "Customers" },
    { id: "sells", name: "Sells" },
    { id: "inventory", name: "Inventory" },
    { id: "expenses", name: "Expenses" },
    { id: "cash-management", name: "Cash Management" },
    { id: "users", name: "Users" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchUsers();
        fetchUserTypes();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (err) {
      setError("Failed to fetch users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTypes = async () => {
    try {
      const q = query(
        collection(db, "userTypes"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const userTypesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUserTypes(userTypesData);
    } catch (err) {
      console.error("Failed to fetch user types:", err);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        ...userForm,
        userPay: parseFloat(userForm.userPay) || 0,
        createdAt: editingUser ? editingUser.createdAt : new Date(),
        updatedAt: new Date(),
      };

      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), userData);
      } else {
        await addDoc(collection(db, "users"), userData);
      }

      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({
        name: "",
        mobile: "",
        email: "",
        username: "",
        password: "",
        address: "",
        userType: "",
        userPay: "",
        isActive: true,
      });
      fetchUsers();
    } catch (err) {
      setError("Failed to save user");
    }
  };

  const handleUserTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      const userTypeData = {
        ...userTypeForm,
        createdAt: editingUserType ? editingUserType.createdAt : new Date(),
        updatedAt: new Date(),
      };

      if (editingUserType) {
        await updateDoc(doc(db, "userTypes", editingUserType.id), userTypeData);
      } else {
        await addDoc(collection(db, "userTypes"), userTypeData);
      }

      setShowUserTypeModal(false);
      setEditingUserType(null);
      setUserTypeForm({
        userType: "",
        isActive: true,
        pages: [],
      });
      fetchUserTypes();
    } catch (err) {
      setError("Failed to save user type");
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || "",
      mobile: user.mobile || "",
      email: user.email || "",
      username: user.username || "",
      password: "",
      address: user.address || "",
      userType: user.userType || "",
      userPay: user.userPay?.toString() || "",
      isActive: user.isActive !== false,
    });
    setShowUserModal(true);
  };

  const handleEditUserType = (userType) => {
    setEditingUserType(userType);
    setUserTypeForm({
      userType: userType.userType || "",
      isActive: userType.isActive !== false,
      pages: userType.pages || [],
    });
    setShowUserTypeModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        fetchUsers();
      } catch (err) {
        setError("Failed to delete user");
      }
    }
  };

  const handleDeleteUserType = async (userTypeId) => {
    if (window.confirm("Are you sure you want to delete this user type?")) {
      try {
        await deleteDoc(doc(db, "userTypes", userTypeId));
        fetchUserTypes();
      } catch (err) {
        setError("Failed to delete user type");
      }
    }
  };

  const handlePageToggle = (pageId) => {
    setUserTypeForm((prev) => ({
      ...prev,
      pages: prev.pages.includes(pageId)
        ? prev.pages.filter((p) => p !== pageId)
        : [...prev.pages, pageId],
    }));
  };

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    return (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Check if current user is admin
  const isAdmin =
    currentUser?.email === "admin@madhavdairy.com" ||
    users.find((u) => u.email === currentUser?.email)?.userType === "admin";

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    { key: "mobile", header: "Mobile" },
    { key: "userType", header: "User Type" },
    { key: "status", header: "Status" },
    { key: "userPay", header: "Salary" },
    { key: "actions", header: "Actions" },
  ];

  const renderUserRows = (user, index) => (
    <tr key={user.id || index} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{user.username}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{user.mobile}</td>
      <td className="px-6 py-4">
        <Chip
          label={user.userType}
          color="primary"
          size="small"
          sx={{ textTransform: "capitalize" }}
        />
      </td>
      <td className="px-6 py-4">
        <Chip
          label={user.isActive !== false ? "Active" : "Inactive"}
          color={user.isActive !== false ? "success" : "error"}
          size="small"
        />
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
        ₹{user.userPay?.toFixed(2) || 0}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <IconButton
            onClick={() => handleEditUser(user)}
            color="primary"
            size="small"
          >
            <FiEdit />
          </IconButton>
          <IconButton
            onClick={() => handleDeleteUser(user.id)}
            color="error"
            size="small"
          >
            <FiTrash2 />
          </IconButton>
        </div>
      </td>
    </tr>
  );

  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          Please log in to access this page.
        </div>
      </div>
    );
  }

  const userTypeOptions = userTypes
    .filter((ut) => ut.isActive)
    .map((userType) => ({
      value: userType.userType,
      label: userType.userType,
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 !mb-0">
              Users Management
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowUserTypeModal(true)}
              variant="contained"
              color="success"
              startIcon={<FiSettings />}
            >
              Add User Type
            </Button>
            <Button
              onClick={() => setShowUserModal(true)}
              variant="contained"
              color="primary"
              startIcon={<FiPlus />}
            >
              Add User
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Users Table */}
        <DataTable
          columns={columns}
          data={filteredUsers}
          renderRow={renderUserRows}
          loading={loading}
          emptyMessage="No users found"
        />

        {/* User Types Section */}
        {isAdmin && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              User Types
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pages Access
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userTypes.map((userType) => (
                    <tr key={userType.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                        {userType.userType}
                      </td>
                      <td className="px-6 py-4">
                        <Chip
                          label={userType.isActive ? "Active" : "Inactive"}
                          color={userType.isActive ? "success" : "error"}
                          size="small"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {userType.userType === "admin"
                          ? "All Pages"
                          : `${userType.pages?.length || 0} pages`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <IconButton
                            onClick={() => handleEditUserType(userType)}
                            color="primary"
                            size="small"
                          >
                            <FiEdit />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteUserType(userType.id)}
                            color="error"
                            size="small"
                          >
                            <FiTrash2 />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
          setUserForm({
            name: "",
            mobile: "",
            email: "",
            username: "",
            password: "",
            address: "",
            userType: "",
            userPay: "",
            isActive: true,
          });
        }}
        title={editingUser ? "Edit User" : "Add New User"}
        size="lg"
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={userForm.name}
              onChange={(e) =>
                setUserForm({ ...userForm, name: e.target.value })
              }
              required
            />
            <Input
              label="Mobile"
              value={userForm.mobile}
              onChange={(e) =>
                setUserForm({ ...userForm, mobile: e.target.value })
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(e) =>
                setUserForm({ ...userForm, email: e.target.value })
              }
              required
            />
            <Input
              label="Username"
              value={userForm.username}
              onChange={(e) =>
                setUserForm({ ...userForm, username: e.target.value })
              }
              required
            />
          </div>
          <Input
            label="Password"
            type="password"
            value={userForm.password}
            onChange={(e) =>
              setUserForm({ ...userForm, password: e.target.value })
            }
            required={!editingUser}
          />
          <Input
            label="Address"
            value={userForm.address}
            onChange={(e) =>
              setUserForm({ ...userForm, address: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="User Type"
              value={userForm.userType}
              onChange={(e) =>
                setUserForm({ ...userForm, userType: e.target.value })
              }
              options={userTypeOptions}
              required
            />
            <div className="space-y-1">
              <FormControlLabel
                control={
                  <Switch
                    checked={userForm.isActive}
                    onChange={(e) =>
                      setUserForm({ ...userForm, isActive: e.target.checked })
                    }
                    color="success"
                  />
                }
                label="Active Status"
              />
            </div>
          </div>
          <Input
            label="User Pay (Salary)"
            type="number"
            value={userForm.userPay}
            onChange={(e) =>
              setUserForm({ ...userForm, userPay: e.target.value })
            }
            placeholder="0"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={() => setShowUserModal(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {editingUser ? "Update" : "Add"} User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit User Type Modal */}
      <Modal
        isOpen={showUserTypeModal}
        onClose={() => {
          setShowUserTypeModal(false);
          setEditingUserType(null);
          setUserTypeForm({
            userType: "",
            isActive: true,
            pages: [],
          });
        }}
        title={editingUserType ? "Edit User Type" : "Add New User Type"}
        size="lg"
      >
        <form onSubmit={handleUserTypeSubmit} className="space-y-4">
          <Input
            label="User Type Name"
            value={userTypeForm.userType}
            onChange={(e) =>
              setUserTypeForm({ ...userTypeForm, userType: e.target.value })
            }
            required
          />

          <div className="space-y-1">
            <FormControlLabel
              control={
                <Switch
                  checked={userTypeForm.isActive}
                  onChange={(e) =>
                    setUserTypeForm({
                      ...userTypeForm,
                      isActive: e.target.checked,
                    })
                  }
                  color="success"
                />
              }
              label="Active Status"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Page Access (Admin has access to all pages)
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-3">
              {availablePages.map((page) => (
                <Checkbox
                  key={page.id}
                  checked={userTypeForm.pages.includes(page.id)}
                  onChange={() => handlePageToggle(page.id)}
                  label={page.name}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={() => setShowUserTypeModal(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="success">
              {editingUserType ? "Update" : "Add"} User Type
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
