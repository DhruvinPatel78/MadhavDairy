import { useState, useEffect } from "react";
import { FormControlLabel, Switch } from '@mui/material';
import { Input, Button, Select } from './';

const ProductForm = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    pricePerUnit: "",
    unit: "",
    isActive: true,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        pricePerUnit: product.pricePerUnit || "",
        unit: product.unit || "",
        isActive: product.isActive !== false,
      });
    }
  }, [product]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      pricePerUnit: parseFloat(formData.pricePerUnit),
    });
  };

  const unitOptions = [
    { value: "Liter", label: "Liter" },
    { value: "Kg", label: "Kg" },
    { value: "Piece", label: "Piece" },
    { value: "Packet", label: "Packet" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Product Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Input
        label="Price per Unit (₹)"
        type="number"
        inputProps={{ step: "0.01" }}
        value={formData.pricePerUnit}
        onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
        required
      />

      <Select
        label="Unit"
        value={formData.unit}
        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
        options={unitOptions}
        required
      />

      <FormControlLabel
        control={
          <Switch
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            color="success"
          />
        }
        label="Active Status"
      />

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outlined"
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
        >
          {product ? "Update" : "Add"} Product
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
