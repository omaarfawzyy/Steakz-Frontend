# Backend Integration Guide

## Setup

1. **Environment Variables**: Copy `.env.example` to `.env` and update the API base URL if needed.

```bash
cp .env.example .env
```

2. **Start your development server**:
```bash
npm run dev
```

## API Integration

The frontend is now connected to your backend at `http://localhost:4000`.

### API Service

All API calls go through `/src/lib/api.js`. The service includes these endpoint groups:

- **Auth**: `authApi.login()`, `authApi.logout()`, `authApi.getCurrentUser()`
- **Users**: `usersApi.getUsers()`, `usersApi.getUserById()`, `usersApi.createUser()`, etc.
- **Branches**: `branchesApi.getBranches()`, `branchesApi.createBranch()`, etc.
- **Menu**: `menuApi.getMenuItems()`, `menuApi.createMenuItem()`, etc.
- **Bookings**: `bookingsApi.getBookings()`, `bookingsApi.createBooking()`, etc.
- **Orders**: `ordersApi.getOrders()`, `ordersApi.createOrder()`, etc.

### Using API in Components

Import from the context:
```jsx
import { useApp } from '../context/AppContext';

export function MyComponent() {
  const { store, loading, error, createBooking } = useApp();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <button onClick={() => createBooking({ customerName: 'John' })}>
      Book
    </button>
  );
}
```

### Adding New Endpoints

Edit `/src/lib/api.js` and add your endpoint:

```javascript
export const myApi = {
  getData: () => api.get('/my-endpoint'),
  create: (data) => api.post('/my-endpoint', data),
};
```

Then use in AppContext or directly import into components.

## Backend Response Format

Your backend should return data in one of these formats:

**Success (200-299)**:
```json
{
  "users": [...],
  "bookings": [...],
  "menuItems": [...]
}
// or
{
  "data": {...}
}
```

**Error (4xx-5xx)**:
The client will log the error and use starter restaurant data if available.

## CORS

If you get CORS errors, make sure your backend includes these headers:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type
```

## Starter Restaurant Data

If the backend is unavailable, the app will:
1. Log the error to console
2. Show `loading` state briefly
3. Use starter restaurant data from `mockData.js`

This allows development to continue even if the backend is down.

## Debugging

Check the browser console for API request logs. Each request logs:
- The endpoint being called
- Success/failure status
- Error details if applicable
