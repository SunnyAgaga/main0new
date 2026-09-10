import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/lib/auth';
import { MusicPlayer } from '@/components/music-player';

import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import RsvpPage from '@/pages/rsvp';
import CartPage from '@/pages/cart';
import GiftPage from '@/pages/gift';
import SignInPage from '@/pages/auth/sign-in';
import DashboardLayout from '@/components/dashboard-layout';
import DashboardIndex from '@/pages/dashboard/index';
import DashboardPayments from '@/pages/dashboard/payments';
import DashboardTeam from '@/pages/dashboard/team';
import DashboardDelivery from '@/pages/dashboard/delivery';
import DashboardNotifications from '@/pages/dashboard/notifications';
import DashboardMusic from '@/pages/dashboard/music';
import DashboardAsoebi from '@/pages/dashboard/asoebi';
import DashboardRsvps from '@/pages/dashboard/rsvps';
import DashboardOrders from '@/pages/dashboard/orders';
import DashboardCampaigns from '@/pages/dashboard/campaigns';
import DashboardRsvpForm from '@/pages/dashboard/rsvp-form';
import DashboardSiteSettings from '@/pages/dashboard/site-settings';
import { SiteTheme } from '@/components/site-theme';

const queryClient = new QueryClient();

function ProtectedDashboard({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect to="/sign-in" />;
  if (adminOnly && user.role !== 'admin') return <Redirect to="/dashboard" />;

  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rsvp" component={RsvpPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/gift" component={GiftPage} />
      <Route path="/sign-in" component={SignInPage} />

      <Route path="/dashboard">
        <ProtectedDashboard>
          <DashboardIndex />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/asoebi">
        <ProtectedDashboard adminOnly>
          <DashboardAsoebi />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/rsvps">
        <ProtectedDashboard adminOnly>
          <DashboardRsvps />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/orders">
        <ProtectedDashboard adminOnly>
          <DashboardOrders />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/campaigns">
        <ProtectedDashboard adminOnly>
          <DashboardCampaigns />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/rsvp-form">
        <ProtectedDashboard adminOnly>
          <DashboardRsvpForm />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/payments">
        <ProtectedDashboard adminOnly>
          <DashboardPayments />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/delivery">
        <ProtectedDashboard adminOnly>
          <DashboardDelivery />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/notifications">
        <ProtectedDashboard adminOnly>
          <DashboardNotifications />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/music">
        <ProtectedDashboard adminOnly>
          <DashboardMusic />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/team">
        <ProtectedDashboard adminOnly>
          <DashboardTeam />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/site-settings">
        <ProtectedDashboard adminOnly>
          <DashboardSiteSettings />
        </ProtectedDashboard>
      </Route>

      <Route component={NotFound} />
    </Switch>
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
          <AuthProvider>
            <RoutedErrorBoundary>
              <Router />
            </RoutedErrorBoundary>
            <MusicPlayer />
            <SiteTheme />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
