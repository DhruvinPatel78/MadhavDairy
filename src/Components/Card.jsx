import { Card as MuiCard, CardContent, CardHeader, CardActions } from '@mui/material';

const Card = ({
  children,
  title,
  actions,
  elevation = 1,
  className = "",
  ...props
}) => {
  return (
    <MuiCard elevation={elevation} className={className} {...props}>
      {title && <CardHeader title={title} />}
      <CardContent>
        {children}
      </CardContent>
      {actions && <CardActions>{actions}</CardActions>}
    </MuiCard>
  );
};

export default Card;