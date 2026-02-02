import { Button as MuiButton } from '@mui/material';

const Button = ({
  children,
  variant = "contained",
  color = "primary",
  size = "medium",
  disabled = false,
  onClick,
  type = "button",
  startIcon,
  endIcon,
  fullWidth = false,
  className = "",
  ...props
}) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      size={size}
      disabled={disabled}
      onClick={onClick}
      type={type}
      startIcon={startIcon}
      endIcon={endIcon}
      fullWidth={fullWidth}
      className={className}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;