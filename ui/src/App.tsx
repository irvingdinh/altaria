import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

const WelcomePage = lazy(() => import("@/apps/core/pages/WelcomePage"));
const TerminalPage = lazy(() => import("@/apps/terminal/pages/TerminalPage"));

function App() {
  return (
    <BrowserRouter>
      <Suspense>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/terminals/:id" element={<TerminalPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
