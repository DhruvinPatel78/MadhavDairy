import DataTable from "./DataTable";
import { MdVisibility, MdEdit, MdDelete } from "react-icons/md";

const ProductList = ({ products, onEdit, onDelete, onView }) => {
  const columns = [
    { header: "Product Name" },
    { header: "Price" },
    { header: "Unit" },
    { header: "Available Qty" },
    { header: "Visibility" },
    { header: "Action" }
  ];

  const renderRow = (product) => (
    <tr key={product.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {product.name}
        </div>
        <div className="text-xs text-gray-500">
          Product ID: {product.id.slice(0, 8)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">₹{product.pricePerUnit}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{product.unit}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{product.quantity || 0}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            (product.quantity || 0) > 10
              ? "bg-green-100 text-green-800"
              : (product.quantity || 0) > 0
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {(product.quantity || 0) > 10
            ? "Visible"
            : (product.quantity || 0) > 0
              ? "Low Stock"
              : "Out of Stock"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        <button
          onClick={() => onView(product)}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
          title="View"
        >
          <MdVisibility className="w-4 h-4" />
        </button>
        <button
          onClick={() => onEdit(product)}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
          title="Edit"
        >
          <MdEdit className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
          title="Delete"
        >
          <MdDelete className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );

  return (
    <DataTable
      title="All Products"
      columns={columns}
      data={products}
      renderRow={renderRow}
      emptyMessage="No products found"
    />
  );
};

export default ProductList;
