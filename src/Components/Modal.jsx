import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material';
import { Close } from '@mui/icons-material';

const Modal = ({ isOpen, onClose, title, children, size = "md", ...props }) => {
  const maxWidth = {
    sm: "sm",
    md: "md",
    lg: "lg",
    xl: "xl",
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={maxWidth[size]}
      fullWidth
      {...props}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>{title}</Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
