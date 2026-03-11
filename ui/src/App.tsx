import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

const WelcomePage = lazy(() => import("@/apps/core/pages/WelcomePage"));

function App() {
  return (
    <BrowserRouter>
      <Suspense>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
