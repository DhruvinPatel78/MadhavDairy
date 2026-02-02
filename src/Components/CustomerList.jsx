import { useState } from "react";
import CustomerDetails from "./CustomerDetails";
import DataTable from "./DataTable";
import { IconButton, Chip } from '@mui/material';
import { Visibility, Edit, Delete } from '@mui/icons-material';
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
    { header: "Status" },
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
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          customer.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {customer.isActive !== false ? 'Active' : 'Inactive'}
        </span>
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
        <IconButton
          onClick={() => onView ? onView(customer) : setSelectedCustomer(customer)}
          color="default"
          size="small"
          title="View"
        >
          <Visibility fontSize="small" />
        </IconButton>
        <IconButton
          onClick={() => onEdit(customer)}
          color="primary"
          size="small"
          title="Edit"
        >
          <Edit fontSize="small" />
        </IconButton>
        <IconButton
          onClick={() => onDelete(customer.id)}
          color="error"
          size="small"
          title="Delete"
        >
          <Delete fontSize="small" />
        </IconButton>
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
