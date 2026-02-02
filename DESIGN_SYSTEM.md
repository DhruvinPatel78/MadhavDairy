# Madhav Dairy Design System

## Overview
This project uses Material-UI as the primary design system to ensure consistent styling across all components and pages.

## Theme Configuration
The theme is configured in `src/theme.js` with:
- Primary color: #2563eb (blue)
- Secondary color: #f8fafc (dairy cream)
- Success, warning, error colors
- Typography settings
- Component overrides

## Common Components

### 1. Input
```jsx
import { Input } from '../Components';

<Input
  label="Customer Name"
  value={value}
  onChange={handleChange}
  required
  size="small"
/>
```

### 2. Button
```jsx
import { Button } from '../Components';

<Button
  variant="contained" // contained | outlined | text
  color="primary" // primary | secondary | success | warning | error
  onClick={handleClick}
  startIcon={<AddIcon />}
>
  Add Customer
</Button>
```

### 3. Select
```jsx
import { Select } from '../Components';

<Select
  label="Payment Mode"
  value={value}
  onChange={handleChange}
  options={[
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' }
  ]}
  required
/>
```

### 4. SearchableDropdown
```jsx
import { SearchableDropdown } from '../Components';

<SearchableDropdown
  label="Customer"
  value={selectedCustomer}
  onChange={setSelectedCustomer}
  options={customerOptions}
  placeholder="Search customers..."
/>
```

### 5. DataTable
```jsx
import { DataTable } from '../Components';

<DataTable
  title="Customers"
  columns={columns}
  data={customers}
  renderRow={(customer, index) => (
    <TableRow key={customer.id}>
      <TableCell>{customer.name}</TableCell>
      <TableCell>{customer.phone}</TableCell>
    </TableRow>
  )}
/>
```

### 6. Modal
```jsx
import { Modal } from '../Components';

<Modal
  isOpen={open}
  onClose={handleClose}
  title="Add Customer"
  size="md" // sm | md | lg | xl
>
  <CustomerForm />
</Modal>
```

### 7. StatCard
```jsx
import { StatCard } from '../Components';

<StatCard
  title="Total Products"
  value={productCount}
  icon={<InventoryIcon />}
  color="primary" // primary | success | warning | error | info
  onClick={() => navigate('/products')}
/>
```

### 8. PageHeader
```jsx
import { PageHeader } from '../Components';

<PageHeader
  title="Dashboard"
  subtitle="Welcome to Madhav Dairy"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Dashboard' }
  ]}
  actions={[
    <Button key="add" startIcon={<AddIcon />}>
      Add New
    </Button>
  ]}
/>
```

### 9. Loading
```jsx
import { Loading } from '../Components';

<Loading message="Loading customers..." />
```

### 10. ConfirmDialog
```jsx
import { ConfirmDialog } from '../Components';

<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleDelete}
  title="Delete Customer"
  message="Are you sure you want to delete this customer?"
  confirmText="Delete"
  confirmColor="error"
/>
```

### 11. NotificationSnackbar
```jsx
import { NotificationSnackbar } from '../Components';

<NotificationSnackbar
  open={snackbarOpen}
  onClose={() => setSnackbarOpen(false)}
  message="Customer added successfully!"
  severity="success" // success | error | warning | info
/>
```

## Layout Components

### Grid System
Use Material-UI Grid for responsive layouts:
```jsx
import { Grid } from '@mui/material';

<Grid container spacing={3}>
  <Grid item xs={12} md={6}>
    <StatCard />
  </Grid>
  <Grid item xs={12} md={6}>
    <StatCard />
  </Grid>
</Grid>
```

### Box for Spacing
Use Box component for consistent spacing:
```jsx
import { Box } from '@mui/material';

<Box p={3}> {/* padding: 24px */}
  <Box mb={2}> {/* margin-bottom: 16px */}
    Content
  </Box>
</Box>
```

## Color Usage

### Primary Actions
- Use `color="primary"` for main actions (Save, Add, Submit)

### Secondary Actions
- Use `variant="outlined"` for secondary actions (Cancel, Back)

### Destructive Actions
- Use `color="error"` for delete/remove actions

### Status Colors
- Success: `color="success"` for positive states
- Warning: `color="warning"` for caution states
- Error: `color="error"` for error states

## Typography
Use Material-UI Typography component:
```jsx
import { Typography } from '@mui/material';

<Typography variant="h1">Page Title</Typography>
<Typography variant="h2">Section Title</Typography>
<Typography variant="body1">Regular text</Typography>
<Typography variant="body2" color="text.secondary">
  Secondary text
</Typography>
```

## Best Practices

1. **Always use common components** instead of creating custom ones
2. **Import from Components/index.js** for consistency
3. **Use theme colors** instead of hardcoded colors
4. **Follow Material-UI spacing** (multiples of 8px)
5. **Use consistent sizing** (small, medium, large)
6. **Maintain responsive design** with Grid system

## Migration Notes

- Replace all custom CSS classes with Material-UI components
- Use theme colors instead of Tailwind classes
- Replace custom buttons with Button component
- Replace custom inputs with Input/Select components
- Use Box/Grid for layout instead of div with classes