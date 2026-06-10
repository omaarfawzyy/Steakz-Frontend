import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { MenuPage } from './pages/MenuPage';
import { AboutPage } from './pages/AboutPage';
import { BookingPage } from './pages/BookingPage';
import { LoginPage } from './pages/LoginPage';
import { PortalPage } from './pages/PortalPage';
import { PortalRedirectPage } from './pages/PortalRedirectPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'book', element: <BookingPage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'branches', element: <Navigate to="/about" replace /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: '/portal',
    element: <PortalRedirectPage />,
  },
  {
    path: '/portal/:role/:section?',
    element: <PortalPage />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
