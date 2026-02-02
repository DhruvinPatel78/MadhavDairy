import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  onClick,
  subtitle,
  ...props 
}) => {
  const colorMap = {
    primary: 'primary.main',
    success: 'success.main',
    warning: 'warning.main',
    error: 'error.main',
    info: 'info.main',
  };

  return (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        } : {},
        borderTop: 3,
        borderTopColor: colorMap[color] || 'primary.main',
      }}
      onClick={onClick}
      {...props}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" component="div" fontWeight="bold" mb={0.5}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight="medium">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box 
              sx={{ 
                p: 1.5, 
                borderRadius: 2, 
                backgroundColor: `${colorMap[color] || 'primary.main'}15`,
                color: colorMap[color] || 'primary.main',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;