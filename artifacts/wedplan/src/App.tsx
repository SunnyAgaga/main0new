import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { ClerkProvider, Show, useAuth } from '@clerk/react';
import { useEffect, useRef } from 'react';

import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import RsvpPage from '@/pages/rsvp';
import CartPage from '@/pages/cart';
import SignInPage from '@/pages/auth/sign-in';
import SignUpPage from '@/pages/auth/sign-up';
import DashboardLayout from '@/components/dashboard-layout';
import DashboardIndex from '@/pages/dashboard/index';
import DashboardPayments from '@/pages/dashboard/payments';

const queryClient = new QueryClient();
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function useAuthCacheInvalidation() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const client = useQueryClient();
  const previous = useRef<
    { isSignedIn: boolean; userId: string | null } | undefined
  >(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const current = { isSignedIn: Boolean(isSignedIn), userId: userId ?? null };
    if (
      previous.current &&
      (previous.current.isSignedIn !== current.isSignedIn ||
        previous.current.userId !== current.userId)
    ) {
      void client.invalidateQueries();
    }
    previous.current = current;
  }, [client, isLoaded, isSignedIn, userId]);
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rsvp" component={RsvpPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      <Route path="/dashboard">
        <Show when="signed-in">
          <DashboardLayout>
            <DashboardIndex />
          </DashboardLayout>
        </Show>
        <Show when="signed-out">
          <Redirect to="/sign-in" />
        </Show>
      </Route>

      <Route path="/dashboard/payments">
        <Show when="signed-in">
          <DashboardLayout>
            <DashboardPayments />
          </DashboardLayout>
        </Show>
        <Show when="signed-out">
          <Redirect to="/sign-in" />
        </Show>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AuthenticatedApp() {
  useAuthCacheInvalidation();
  return (
    <RoutedErrorBoundary>
      <Router />
    </RoutedErrorBoundary>
  );
}

function ClerkApp() {
  const [, navigate] = useLocation();
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const signInUrl = `${base}/sign-in`;
  const signUpUrl = `${base}/sign-up`;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={`${base}/dashboard`}
      signUpFallbackRedirectUrl={`${base}/dashboard`}
      afterSignOutUrl={`${base}/`}
      proxyUrl={
        import.meta.env.PROD
          ? `${window.location.origin}/api/__clerk`
          : undefined
      }
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      appearance={{
        variables: {
          colorPrimary: 'hsl(158, 64%, 20%)',
          colorForeground: 'hsl(158, 64%, 10%)',
          colorBackground: 'hsl(40, 33%, 98%)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
        elements: {
          cardBox: 'shadow-xl',
          footerActionLink: 'text-primary',
        },
      }}
    >
      <AuthenticatedApp />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ClerkApp />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;