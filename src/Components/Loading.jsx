import { CircularProgress, Box, Typography } from '@mui/material';

const Loading = ({ 
  size = 40, 
  message = "Loading...", 
  centered = true,
  color = "primary" 
}) => {
  const content = (
    <>
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </>
  );

  if (centered) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="200px"
      >
        {content}
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={2}>
      {content}
    </Box>
  );
};

export default Loading;