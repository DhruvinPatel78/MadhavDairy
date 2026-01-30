import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, Timestamp, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import CustomerDetails from "../components/CustomerDetails";
import axios from "axios";

const Sales = () => {
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [customer, setCustomer] = useState(null);
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState("");
    const [paymentMode, setPaymentMode] = useState("cash");
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDetails, setShowCustomerDetails] = useState(false);
    const [filteredCustomers, setFilteredCustomers] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                loadData();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const filtered = customers.filter(c => 
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone.includes(customerSearch)
        );
        setFilteredCustomers(filtered);
    }, [customerSearch, customers]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const custSnap = await getDocs(collection(db, "customers"));
            const prodSnap = await getDocs(collection(db, "products"));

            setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error loading data:", err);
            setError("Failed to load data. Please check your permissions.");
        } finally {
            setLoading(false);
        }
    };

    // Auto price calculation
    useEffect(() => {
        if (product && quantity) {
            setTotal(quantity * product.pricePerUnit);
        }
    }, [quantity, product]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customer || !product) {
            setError("Please select both customer and product");
            return;
        }
        
        if (!user) {
            setError("You must be logged in to complete a sale.");
            return;
        }

        if (parseFloat(quantity) > (product.quantity || 0)) {
            setError(`Insufficient stock. Only ${product.quantity || 0} ${product.unit} available`);
            return;
        }

        try {
            setError(null);
            const saleData = {
                customerId: customer.id,
                customerName: customer.name,
                phone: customer.phone,
                productId: product.id,
                productName: product.name,
                unit: product.unit,
                pricePerUnit: product.pricePerUnit,
                quantity: Number(quantity),
                totalPrice: total,
                paymentMode: paymentMode,
                createdAt: Timestamp.now()
            };

            // Save sale
            await addDoc(collection(db, "sales"), saleData);

            // Update product quantity
            const newQuantity = (product.quantity || 0) - Number(quantity);
            await updateDoc(doc(db, "products", product.id), {
                quantity: newQuantity
            });

            // Try to send SMS (optional - won't fail if SMS service is down)
            try {
                await axios.post("http://localhost:5000/send-sms", {
                    phone: customer.phone,
                    message: `Hello ${customer.name},\nYou purchased ${quantity} ${product.unit} ${product.name}.\nTotal: ₹${total}\nPayment: ${paymentMode}\n- Madhav Dairy`
                });
                alert("Sale completed & SMS sent!");
            } catch (smsErr) {
                console.warn("SMS service unavailable:", smsErr);
                alert("Sale completed! (SMS service unavailable)");
            }

            // Reset form and reload data
            setCustomer(null);
            setProduct(null);
            setQuantity("");
            setPaymentMode("cash");
            setTotal(0);
            setCustomerSearch("");
            loadData(); // Reload to get updated quantities
        } catch (err) {
            console.error("Error completing sale:", err);
            setError("Failed to complete sale. Please try again.");
        }
    };

    if (!user) {
        return (
            <div className="p-6">
                <div className="alert alert-warning">
                    Please log in to access sales.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">Loading sales data...</span>
                </div>
            </div>
        );
    }

    if (showCustomerDetails && customer) {
        return (
            <CustomerDetails 
                customer={customer} 
                onBack={() => setShowCustomerDetails(false)} 
            />
        );
    }

    return (
        <div className="p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">New Sale</h1>

            {error && (
                <div className="alert alert-error mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer Search */}
                <div>
                    <label className="block text-sm font-medium mb-1">Search Customer</label>
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        className="border p-2 w-full mb-2"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    <select
                        className="border p-2 w-full"
                        onChange={(e) => {
                            const selectedCustomer = customers.find(c => c.id === e.target.value);
                            setCustomer(selectedCustomer);
                        }}
                        value={customer?.id || ""}
                        required
                    >
                        <option value="">Select Customer</option>
                        {filteredCustomers.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} - {c.phone}
                            </option>
                        ))}
                    </select>
                    {customer && (
                        <button
                            type="button"
                            onClick={() => setShowCustomerDetails(true)}
                            className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
                        >
                            View Customer Details
                        </button>
                    )}
                </div>

                <select
                    className="border p-2 w-full"
                    onChange={(e) => {
                        const selectedProduct = products.find(p => p.id === e.target.value);
                        setProduct(selectedProduct);
                        setQuantity(""); // Reset quantity when product changes
                    }}
                    value={product?.id || ""}
                    required
                >
                    <option value="">Select Product</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} (₹{p.pricePerUnit}/{p.unit}) - Available: {p.quantity || 0}
                        </option>
                    ))}
                </select>

                {product && (
                    <div className="text-sm text-gray-600 mt-1">
                        Available Stock: {product.quantity || 0} {product.unit}
                        {(product.quantity || 0) === 0 && (
                            <span className="text-red-500 ml-2">Out of Stock!</span>
                        )}
                    </div>
                )}

                <input
                    type="number"
                    step="0.01"
                    placeholder="Quantity"
                    className="border p-2 w-full"
                    value={quantity}
                    max={product?.quantity || 0}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value <= (product?.quantity || 0)) {
                            setQuantity(e.target.value);
                        } else {
                            setError(`Only ${product?.quantity || 0} ${product?.unit || 'units'} available`);
                        }
                    }}
                    required
                />

                <div>
                    <label className="block text-sm font-medium mb-1">Payment Mode</label>
                    <select
                        className="border p-2 w-full"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        required
                    >
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                    </select>
                </div>

                <div className="font-bold text-lg">
                    Total: ₹{total}
                </div>

                <button className="bg-green-600 text-white px-4 py-2 rounded w-full">
                    Complete Sale
                </button>
            </form>
        </div>
    );
};

export default Sales;
