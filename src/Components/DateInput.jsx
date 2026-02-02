import { TextField } from '@mui/material';

const DateInput = ({
  label,
  value,
  onChange,
  required = false,
  className = "",
  mainClassName = "",
  ...props
}) => {
  return (
    <div className={mainClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <TextField
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        fullWidth
        variant="outlined"
        size="small"
        className={className}
        {...props}
      />
    </div>
  );
};

export default DateInput;