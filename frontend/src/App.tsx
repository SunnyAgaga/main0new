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
import PassPage from '@/pages/pass';
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
import DashboardCheckIn from '@/pages/dashboard/check-in';
import DashboardRsvpForm from '@/pages/dashboard/rsvp-form';
import DashboardSiteSettings from '@/pages/dashboard/site-settings';
import { SiteTheme } from '@/components/site-theme';
import type { PermissionKey } from '@wedplan/shared';

const queryClient = new QueryClient();

function ProtectedDashboard({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: PermissionKey | 'team';
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect to="/sign-in" />;

  const allowed =
    !permission ||
    user.role === 'admin' ||
    (permission !== 'team' && user.permissions?.includes(permission));
  if (!allowed) return <Redirect to="/dashboard" />;

  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rsvp" component={RsvpPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/gift" component={GiftPage} />
      <Route path="/pass/:token">{(params) => <PassPage token={params.token} />}</Route>
      <Route path="/sign-in" component={SignInPage} />

      <Route path="/dashboard">
        <ProtectedDashboard>
          <DashboardIndex />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/asoebi">
        <ProtectedDashboard permission="asoebi">
          <DashboardAsoebi />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/rsvps">
        <ProtectedDashboard permission="rsvps">
          <DashboardRsvps />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/orders">
        <ProtectedDashboard permission="orders">
          <DashboardOrders />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/campaigns">
        <ProtectedDashboard permission="campaigns">
          <DashboardCampaigns />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/check-in">
        <ProtectedDashboard permission="check-in">
          <DashboardCheckIn />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/rsvp-form">
        <ProtectedDashboard permission="rsvp-form">
          <DashboardRsvpForm />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/payments">
        <ProtectedDashboard permission="payments">
          <DashboardPayments />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/delivery">
        <ProtectedDashboard permission="delivery">
          <DashboardDelivery />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/notifications">
        <ProtectedDashboard permission="notifications">
          <DashboardNotifications />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/music">
        <ProtectedDashboard permission="music">
          <DashboardMusic />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/team">
        <ProtectedDashboard permission="team">
          <DashboardTeam />
        </ProtectedDashboard>
      </Route>

      <Route path="/dashboard/site-settings">
        <ProtectedDashboard permission="site-settings">
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
