import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { MdCheck, MdClose } from "react-icons/md";

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [dailyStats, setDailyStats] = useState({});
    const [monthlyStats, setMonthlyStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('today');
    const [editingStock, setEditingStock] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                loadInventoryData();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const loadInventoryData = async () => {
        try {
            setLoading(true);
            
            // Get all products
            const productsSnap = await getDocs(collection(db, "products"));
            const productsData = productsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(productsData);

            // Get sales data for calculations
            const salesSnap = await getDocs(
                query(collection(db, "sales"), orderBy("createdAt", "desc"))
            );
            const salesData = salesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));

            calculateStats(productsData, salesData);
        } catch (error) {
            console.error("Error loading inventory data:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (products, sales) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // Calculate daily stats
        const todaySales = sales.filter(sale => 
            sale.createdAt >= today && sale.createdAt < tomorrow
        );

        const dailyProductStats = {};
        products.forEach(product => {
            const productSales = todaySales.filter(sale => sale.productId === product.id);
            const totalSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
            
            dailyProductStats[product.id] = {
                name: product.name,
                currentStock: product.quantity || 0,
                soldToday: totalSold,
                revenueToday: productSales.reduce((sum, sale) => sum + sale.totalPrice, 0)
            };
        });

        // Calculate monthly stats
        const monthSales = sales.filter(sale => 
            sale.createdAt >= thisMonth && sale.createdAt < nextMonth
        );

        const monthlyProductStats = {};
        products.forEach(product => {
            const productSales = monthSales.filter(sale => sale.productId === product.id);
            const totalSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
            
            monthlyProductStats[product.id] = {
                name: product.name,
                currentStock: product.quantity || 0,
                soldThisMonth: totalSold,
                revenueThisMonth: productSales.reduce((sum, sale) => sum + sale.totalPrice, 0)
            };
        });

        setDailyStats(dailyProductStats);
        setMonthlyStats(monthlyProductStats);
    };

    const handleStockUpdate = async (productId, newQuantity) => {
        try {
            setError(null);
            await updateDoc(doc(db, "products", productId), {
                quantity: Number(newQuantity)
            });
            
            setEditingStock(prev => ({ ...prev, [productId]: false }));
            loadInventoryData(); // Reload data
        } catch (err) {
            console.error("Error updating stock:", err);
            setError("Failed to update stock. Please try again.");
        }
    };

    if (!user) {
        return (
            <div className="p-6">
                <div className="alert alert-warning">
                    Please log in to access inventory.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">Loading inventory...</span>
                </div>
            </div>
        );
    }

    const currentStats = selectedPeriod === 'today' ? dailyStats : monthlyStats;
    const soldKey = selectedPeriod === 'today' ? 'soldToday' : 'soldThisMonth';
    const revenueKey = selectedPeriod === 'today' ? 'revenueToday' : 'revenueThisMonth';

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Inventory Management</h1>
                <select 
                    className="border p-2 rounded"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                    <option value="today">Today</option>
                    <option value="month">This Month</option>
                </select>
            </div>

            {error && (
                <div className="alert alert-error mb-4">
                    {error}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-number">
                        {Object.values(currentStats).reduce((sum, stat) => sum + stat.currentStock, 0)}
                    </div>
                    <div className="stat-label">Total Stock</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">
                        {Object.values(currentStats).reduce((sum, stat) => sum + stat[soldKey], 0)}
                    </div>
                    <div className="stat-label">
                        {selectedPeriod === 'today' ? 'Sold Today' : 'Sold This Month'}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">
                        ₹{Object.values(currentStats).reduce((sum, stat) => sum + stat[revenueKey], 0)}
                    </div>
                    <div className="stat-label">
                        {selectedPeriod === 'today' ? 'Revenue Today' : 'Revenue This Month'}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">
                        {Object.values(currentStats).filter(stat => stat.currentStock <= 10).length}
                    </div>
                    <div className="stat-label">Low Stock Items</div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-xl font-semibold">
                        Product Inventory - {selectedPeriod === 'today' ? 'Daily' : 'Monthly'} View
                    </h3>
                </div>
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Current Stock</th>
                                    <th>
                                        {selectedPeriod === 'today' ? 'Sold Today' : 'Sold This Month'}
                                    </th>
                                    <th>
                                        {selectedPeriod === 'today' ? 'Revenue Today' : 'Revenue This Month'}
                                    </th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(currentStats).map(([productId, stats]) => (
                                    <tr key={productId}>
                                        <td className="font-medium">{stats.name}</td>
                                        <td>
                                            {editingStock[productId] ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        className="border p-1 w-20"
                                                        defaultValue={stats.currentStock}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleStockUpdate(productId, e.target.value);
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            const input = e.target.parentElement.querySelector('input');
                                                            handleStockUpdate(productId, input.value);
                                                        }}
                                                        className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                                                    >
                                                        <MdCheck />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingStock(prev => ({ ...prev, [productId]: false }))}
                                                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
                                                    >
                                                        <MdClose />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span onClick={() => setEditingStock(prev => ({ ...prev, [productId]: true }))} className="cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                    {stats.currentStock}
                                                </span>
                                            )}
                                        </td>
                                        <td>{stats[soldKey]}</td>
                                        <td>₹{stats[revenueKey]}</td>
                                        <td>
                                            <span className={`badge ${
                                                stats.currentStock > 10 ? 'badge-success' : 
                                                stats.currentStock > 0 ? 'badge-warning' : 'badge-error'
                                            }`}>
                                                {stats.currentStock > 10 ? 'In Stock' : 
                                                 stats.currentStock > 0 ? 'Low Stock' : 'Out of Stock'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => setEditingStock(prev => ({ ...prev, [productId]: true }))}
                                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                                            >
                                                Update Stock
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inventory;