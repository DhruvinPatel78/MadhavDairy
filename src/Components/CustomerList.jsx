import { useState } from "react";
import CustomerDetails from "./CustomerDetails";
import DataTable from "./DataTable";
import { MdVisibility, MdEdit, MdDelete } from "react-icons/md";
import { formatTotalDue } from "../utils/formatters";

const CustomerList = ({ customers, onEdit, onDelete, onView }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  if (selectedCustomer) {
    return (
      <CustomerDetails
        customer={selectedCustomer}
        onBack={() => setSelectedCustomer(null)}
      />
    );
  }

  const columns = [
    { header: "Name" },
    { header: "Phone" },
    { header: "Address" },
    { header: "Payment Status" },
    { header: "Action" },
  ];

  const renderRow = (customer) => (
    <tr key={customer.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{customer.phone}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-500">{customer.address}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${formatTotalDue(customer.totalDue).className}`}>
          {formatTotalDue(customer.totalDue).status}
        </span>
        <div className={`text-xs mt-1 ${formatTotalDue(customer.totalDue).amountClassName}`}>
          {formatTotalDue(customer.totalDue).amount}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        <button
          onClick={() =>
            onView ? onView(customer) : setSelectedCustomer(customer)
          }
          className="text-gray-400 hover:text-gray-600  cursor-pointer"
          title="View"
        >
          <MdVisibility className="w-4 h-4" />
        </button>
        <button
          onClick={() => onEdit(customer)}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
          title="Edit"
        >
          <MdEdit className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(customer.id)}
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
      title="All Customers"
      columns={columns}
      data={customers}
      renderRow={renderRow}
      emptyMessage="No customers found"
    />
  );
};

export default CustomerList;
