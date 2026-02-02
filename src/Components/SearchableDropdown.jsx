import { Autocomplete, TextField, Box } from "@mui/material";

const SearchableDropdown = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Search and select...",
  required = false,
  className = "",
  mainClassName = "",
  ...props
}) => {
  const selectedOption = options.find((option) => option.value === value);

  const handleChange = (event, newValue) => {
    onChange(newValue ? newValue.value : "");
  };

  return (
    <Box className={mainClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Autocomplete
        options={options}
        getOptionLabel={(option) => option.label}
        value={selectedOption || null}
        onChange={handleChange}
        isOptionEqualToValue={(option, value) => option.value === value?.value}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            required={required}
            variant="outlined"
            size="small"
            className={className}
          />
        )}
        {...props}
      />
    </Box>
  );
};

export default SearchableDropdown;
