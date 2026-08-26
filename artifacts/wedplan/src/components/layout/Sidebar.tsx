import * as React from "react"
import { Link, useLocation } from "wouter"
import { Heart, LayoutDashboard, Users, Bell, Shirt, Settings } from "lucide-react"
import { useGetWedding } from "@workspace/api-client-react"

export function Sidebar() {
  const [location] = useLocation()
  const { data: wedding } = useGetWedding()

  const navItems = [
    { href: "/dashboard", label: wedding?.menuDashboard ?? "Dashboard", icon: LayoutDashboard },
    { href: "/guests", label: wedding?.menuGuests ?? "Guests & RSVP", icon: Users },
    { href: "/notifications", label: wedding?.menuNotifications ?? "Campaigns", icon: Bell },
    { href: "/aso-ebi", label: wedding?.menuAsoEbi ?? "Aso Ebi", icon: Shirt },
    { href: "/settings", label: wedding?.menuSettings ?? "Settings", icon: Settings },
  ]

  return (
    <div className="flex w-full shrink-0 flex-col border-b bg-card md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-16 items-center border-b px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-primary font-serif font-semibold text-lg hover:opacity-80 transition-opacity">
          <Heart className="h-5 w-5 fill-current" />
          <span>WedPlan</span>
        </Link>
      </div>
      <nav className="flex flex-1 gap-1 overflow-x-auto p-2 md:block md:space-y-1 md:overflow-visible md:p-4">
        {navItems.map((item) => {
          const isActive = location === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-max items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors md:gap-3 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="hidden border-t p-4 md:block">
        <div className="rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-sm font-medium text-foreground">Couple's Workspace</p>
          <p className="text-xs text-muted-foreground mt-1">Admin Access</p>
        </div>
      </div>
    </div>
  )
}
