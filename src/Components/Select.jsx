import { FormControl, Select as MuiSelect, MenuItem } from '@mui/material';

const Select = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option",
  required = false,
  className = "",
  size = "small",
  ...props 
}) => {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <FormControl fullWidth size={size} required={required} className={className}>
        <MuiSelect
          value={value}
          onChange={onChange}
          displayEmpty
          {...props}
        >
          {placeholder && (
            <MenuItem value="" disabled>
              <span className="text-gray-500">{placeholder}</span>
            </MenuItem>
          )}
          {options.map((option, index) => (
            <MenuItem key={index} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
    </div>
  );
};

export default Select;