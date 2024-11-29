import { BrowserRouter, useRoutes } from 'react-router-dom';
import { ConsolePage } from './pages/ConsolePage';
import './App.scss';

import { LoginPage } from './pages/LoginPage';

const AppRoutes = () => {
  const routes = useRoutes([
    { path: "/", element: <ConsolePage /> },
    { path: "/login", element: <LoginPage /> },
  ]);

  return routes;
};

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
