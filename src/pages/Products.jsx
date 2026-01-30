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
import ProductForm from "../components/ProductForm";
import ProductList from "../components/ProductList";
import Modal from "../components/Modal";

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const productsRef = collection(db, "products");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchProducts();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(productsRef);
      setProducts(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      );
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (data) => {
    if (!user) {
      setError("You must be logged in to perform this action.");
      return;
    }

    try {
      setError(null);
      const productData = {
        ...data,
        createdAt: selectedProduct?.id ? selectedProduct.createdAt : new Date(),
        updatedAt: new Date()
      };
      
      if (selectedProduct?.id) {
        await updateDoc(doc(db, "products", selectedProduct.id), productData);
      } else {
        await addDoc(productsRef, productData);
      }
      fetchProducts();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error("Error saving product:", err);
      setError("Failed to save product. Please try again.");
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleViewProduct = (product) => {
    navigate(`/products/${product.id}`);
  };

  const deleteProduct = async (id) => {
    if (!user) {
      setError("You must be logged in to perform this action.");
      return;
    }

    try {
      setError(null);
      await deleteDoc(doc(db, "products", id));
      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("Failed to delete product. Please try again.");
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          Please log in to access products.
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
            <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
            {/*<p className="text-sm text-gray-500 mt-1">Manage dairy products</p>*/}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>+</span>
            Add New Product
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
            <span className="ml-3 text-gray-500">Loading products...</span>
          </div>
        ) : (
          <ProductList
            products={products}
            onEdit={handleEditProduct}
            onView={handleViewProduct}
            onDelete={deleteProduct}
          />
        )}
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedProduct(null);
        }}
        title="Add New Product"
      >
        <ProductForm
          onSave={handleSaveProduct}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
        }}
        title="Edit Product"
      >
        <ProductForm
          product={selectedProduct}
          onSave={handleSaveProduct}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
};

export default Products;
