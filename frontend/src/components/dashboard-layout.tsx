import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, LogOut, Settings, Users, Truck, Bell, Music, ShoppingBag, Palette, ClipboardList, FileEdit } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { useGetSiteSettings } from '@/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, adminOnly: false },
  { href: '/dashboard/rsvps', label: 'RSVPs', icon: ClipboardList, adminOnly: true },
  { href: '/dashboard/rsvp-form', label: 'RSVP Form', icon: FileEdit, adminOnly: true },
  { href: '/dashboard/site-settings', label: 'Site Settings', icon: Palette, adminOnly: true },
  { href: '/dashboard/asoebi', label: 'Asoebi Catalog', icon: ShoppingBag, adminOnly: true },
  { href: '/dashboard/payments', label: 'Payment Settings', icon: Settings, adminOnly: true },
  { href: '/dashboard/delivery', label: 'Delivery Settings', icon: Truck, adminOnly: true },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, adminOnly: true },
  { href: '/dashboard/music', label: 'Music', icon: Music, adminOnly: true },
  { href: '/dashboard/team', label: 'Team', icon: Users, adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { data: settings } = useGetSiteSettings();
  const logoSrc = settings?.logoUrl || `${import.meta.env.BASE_URL}logo.svg`;
  const logoHeight = Math.min(settings?.logoHeight ?? 24, 40);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 flex items-center justify-between border-b border-border">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoSrc} alt="Logo" style={{ height: logoHeight }} className="object-contain" />
            </Link>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarMenu>
              {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location === item.href} tooltip={item.label}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
              <img src={logoSrc} alt="Logo" style={{ height: logoHeight }} className="object-contain" />
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
