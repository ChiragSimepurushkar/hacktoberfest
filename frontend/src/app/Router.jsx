import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppShell from './AppShell';
import Home      from '../pages/Home';
import Upload    from '../pages/Upload';
import Analyzing from '../pages/Analyzing';
import Simulation from '../pages/Simulation';
import Analysis  from '../pages/Analysis';
import Examples  from '../pages/Examples';
import History   from '../pages/History';
import SettingsModal from '../pages/Settings';
import NotFound  from '../pages/NotFound';
import DevKit    from '../pages/DevKit';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

export default function Router() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/"              element={<Home />} />
            <Route path="/new"           element={<Upload />} />
            <Route path="/analyze"       element={<Analyzing />} />
            <Route path="/sim/:id"       element={<Simulation />} />
            <Route path="/sim/:id/analysis" element={<Analysis />} />
            <Route path="/examples"      element={<Examples />} />
            <Route path="/history"       element={<History />} />
            <Route path="/settings"      element={<SettingsModal />} />
            <Route path="/dev/kit"       element={<DevKit />} />
            <Route path="*"             element={<NotFound />} />
          </Routes>
        </AppShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
