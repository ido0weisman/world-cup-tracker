import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

import Home from '../pages/Home/Home';
import MatchesToday from '../pages/MatchesToday/MatchesToday';
import MatchesWeek from '../pages/MatchesWeek/MatchesWeek';
import Overview from '../pages/Overview/Overview';
import Betting from '../pages/Betting/Betting';
import NewRules from '../pages/NewRules/NewRules';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import NotFound from '../pages/NotFound/NotFound';
import Layout from '../components/layout/Layout';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index         element={<Home />} />
          <Route path="today"  element={<MatchesToday />} />
          <Route path="week"   element={<MatchesWeek />} />
          <Route path="overview" element={<Overview />} />
          <Route path="rules"    element={<NewRules />} />
          <Route path="login"    element={<Login />} />
          <Route path="register" element={<Register />} />

          <Route
            path="betting/*"
            element={
              <ProtectedRoute>
                <Betting />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
