import { createBrowserRouter } from 'react-router-dom';
import { TerminalPage } from './apps/terminal/pages/TerminalPage';

export const router = createBrowserRouter([
  { path: '/', element: <TerminalPage /> },
  { path: '/terminals/:id', element: <TerminalPage /> },
]);
