import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 flex items-center justify-between border-b border-border">
            <Link href="/" className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="WedPlan Logo" className="h-6 object-contain" />
            </Link>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/dashboard'} tooltip="Overview">
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === '/dashboard/payments'} tooltip="Payments">
                    <Link href="/dashboard/payments" className="flex items-center gap-3">
                      <Settings className="w-4 h-4" />
                      <span>Payment Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === '/dashboard/team'} tooltip="Team">
                    <Link href="/dashboard/team" className="flex items-center gap-3">
                      <Users className="w-4 h-4" />
                      <span>Team</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border flex flex-row items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.email || 'Admin'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role ?? 'Admin'}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                setLocation('/');
              }}
              className="rounded-md p-2 text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="h-14 border-b border-border flex items-center px-4 md:hidden">
            <SidebarTrigger />
            <div className="ml-4">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="WedPlan Logo" className="h-5 object-contain" />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}