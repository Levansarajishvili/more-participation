import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import '@fontsource-variable/noto-sans-georgian';
import '@fontsource/noto-serif-georgian/500.css';
import './styles/index.css';

import { routes } from './routes.jsx';

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
