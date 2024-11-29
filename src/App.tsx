import { BrowserRouter, useRoutes } from 'react-router-dom';
import { ConsolePage } from './pages/ConsolePage';
import './App.scss';

import { LoginPage } from './pages/LoginPage';
import { Toaster } from 'react-hot-toast';

const AppRoutes = () => {
  const routes = useRoutes([
    { path: "/", element: <ConsolePage /> },
    { path: "/login", element: <LoginPage /> },
  ]);

  return routes;
};

const App = () => (
  <BrowserRouter>
    <Toaster />
    <AppRoutes />
  </BrowserRouter>
);

export default App;
