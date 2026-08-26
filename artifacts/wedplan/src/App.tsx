import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Guests from '@/pages/Guests';
import Notifications from '@/pages/Notifications';
import AsoEbi from '@/pages/AsoEbi';
import Settings from '@/pages/Settings';
import CheckIn from '@/pages/CheckIn';
import PaymentComplete from '@/pages/PaymentComplete';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Public Route */}
        <Route path="/" component={Home} />
        
        {/* Dashboard Routes wrapped in DashboardLayout */}
        <Route path="/dashboard">
          <DashboardLayout><Dashboard /></DashboardLayout>
        </Route>
        <Route path="/guests">
          <DashboardLayout><Guests /></DashboardLayout>
        </Route>
        <Route path="/notifications">
          <DashboardLayout><Notifications /></DashboardLayout>
        </Route>
        <Route path="/aso-ebi">
          <DashboardLayout><AsoEbi /></DashboardLayout>
        </Route>
        <Route path="/settings">
          <DashboardLayout><Settings /></DashboardLayout>
        </Route>
        <Route path="/check-in" component={CheckIn} />
        <Route path="/payment-complete" component={PaymentComplete} />
        
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
