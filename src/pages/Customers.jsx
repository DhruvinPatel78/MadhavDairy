import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import CustomerForm from "../components/CustomerForm";
import CustomerList from "../components/CustomerList";
import Modal from "../components/Modal";
import { formatTotalDue } from "../utils/formatters";

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDues, setCustomerDues] = useState({});

  const customersRef = collection(db, "customers");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchCustomers();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const [customersSnapshot, salesSnapshot] = await Promise.all([
        getDocs(customersRef),
        getDocs(collection(db, "sales")),
      ]);

      setCustomers(
        customersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      );

      // Calculate customer dues from database (primary source)
      const sales = salesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const dues = {};
      
      // Get totalDue from customer records (can be positive for due or negative for credit)
      customersSnapshot.docs.forEach((doc) => {
        const customerData = doc.data();
        // Always use database totalDue value, can be positive (due) or negative (credit)
        dues[doc.id] = customerData.totalDue || 0;
      });
      
      setCustomerDues(dues);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to load customers. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (data) => {
    if (!user) {
      setError("You must be logged in to perform this action.");
      return;
    }

    try {
      setError(null);
      const customerData = {
        ...data,
        createdAt: selectedCustomer?.id ? selectedCustomer.createdAt : new Date(),
        updatedAt: new Date()
      };
      
      if (selectedCustomer?.id) {
        await updateDoc(doc(db, "customers", selectedCustomer.id), customerData);
      } else {
        await addDoc(customersRef, customerData);
      }
      fetchCustomers();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedCustomer(null);
    } catch (err) {
      console.error("Error saving customer:", err);
      setError("Failed to save customer. Please try again.");
    }
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleViewCustomer = (customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const deleteCustomer = async (id) => {
    if (!user) {
      setError("You must be logged in to perform this action.");
      return;
    }

    try {
      setError(null);
      await deleteDoc(doc(db, "customers", id));
      fetchCustomers();
    } catch (err) {
      console.error("Error deleting customer:", err);
      setError("Failed to delete customer. Please try again.");
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          Please log in to access customers.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
            {/*<p className="text-sm text-gray-500 mt-1">*/}
            {/*  Manage customer information*/}
            {/*</p>*/}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>+</span>
            Add New Customer
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
            <span className="ml-3 text-gray-500">Loading customers...</span>
          </div>
        ) : (
          <CustomerList
            customers={customers}
            onEdit={handleEditCustomer}
            onView={handleViewCustomer}
            onDelete={deleteCustomer}
          />
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedCustomer(null);
        }}
        title="Add New Customer"
      >
        <CustomerForm
          onSave={handleSaveCustomer}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCustomer(null);
        }}
        title="Edit Customer"
      >
        <CustomerForm
          customer={selectedCustomer}
          onSave={handleSaveCustomer}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
};

export default Customers;
