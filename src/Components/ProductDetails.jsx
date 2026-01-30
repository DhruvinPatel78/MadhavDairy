const ProductDetails = ({ product }) => {
  const getStockStatus = (quantity) => {
    if (quantity > 10) return { text: "In Stock", color: "text-green-600 bg-green-100" };
    if (quantity > 0) return { text: "Low Stock", color: "text-yellow-600 bg-yellow-100" };
    return { text: "Out of Stock", color: "text-red-600 bg-red-100" };
  };

  const status = getStockStatus(product.quantity || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">Product Name</label>
          <p className="text-lg font-semibold text-gray-900">{product.name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Product ID</label>
          <p className="text-sm text-gray-700">{product.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">Price per Unit</label>
          <p className="text-lg font-semibold text-gray-900">₹{product.pricePerUnit}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Unit</label>
          <p className="text-lg text-gray-900">{product.unit}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">Available Quantity</label>
          <p className="text-lg font-semibold text-gray-900">{product.quantity || 0}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Stock Status</label>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
            {status.text}
          </span>
        </div>
      </div>

      {product.createdAt && (
        <div>
          <label className="block text-sm font-medium text-gray-500">Created Date</label>
          <p className="text-sm text-gray-700">
            {product.createdAt.toDate?.().toLocaleDateString() || "N/A"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;