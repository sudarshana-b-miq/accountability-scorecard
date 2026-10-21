import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Scorecard } from './pages/Scorecard';
import { LineItem } from './pages/LineItem';
import { Recommendations } from './pages/Recommendations';
import { Genie } from './pages/Genie';
import { AdminReview } from './pages/AdminReview';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Scorecard />} />
          <Route path="item/:id" element={<LineItem />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="genie" element={<Genie />} />
          <Route path="admin" element={<AdminReview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
