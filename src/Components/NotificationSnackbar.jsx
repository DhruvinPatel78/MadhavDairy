import { Snackbar, Alert } from '@mui/material';

const NotificationSnackbar = ({
  open,
  onClose,
  message,
  severity = "info",
  autoHideDuration = 6000,
  ...props
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      {...props}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;