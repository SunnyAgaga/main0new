import * as React from "react"

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="font-serif text-lg text-foreground">
        Organizer Overview
      </div>
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif text-sm">
          OA
        </div>
      </div>
    </header>
  )
}
