import { Link } from 'wouter';
import { useGetEvent } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Countdown } from '@/components/countdown';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { data: event, isLoading, error } = useGetEvent();
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: "radial-gradient(circle at top right, hsl(43, 74%, 49%), transparent 50%), radial-gradient(circle at bottom left, hsl(158, 64%, 20%), transparent 50%)"
      }} />

      <header className="w-full flex justify-between items-center p-6 lg:px-12 relative z-10">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="WedPlan Logo" className="h-8 object-contain" />
        </div>
        {user && (
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline underline-offset-4">
            Dashboard
          </Link>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="max-w-2xl w-full space-y-12">
          {isLoading ? (
            <div className="space-y-6 flex flex-col items-center">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-16 w-3/4 rounded-lg" />
              <Skeleton className="h-6 w-1/2 rounded-full" />
              <Skeleton className="h-12 w-40 rounded-full mt-8" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
              <p>Failed to load event details. Please try again later.</p>
            </div>
          ) : event ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-10">
              <div className="space-y-8">
                <span className="inline-block text-primary/80 font-medium tracking-widest uppercase text-sm border-b border-primary/20 pb-1">
                  You are invited
                </span>

                <h1 className="text-5xl md:text-7xl font-serif text-foreground leading-tight">
                  {event.coupleNames}
                </h1>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
                <div className="space-y-4 p-6 rounded-2xl border border-primary/15 bg-card/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Traditional Wedding</p>
                  <div className="space-y-1 text-muted-foreground font-medium">
                    <p>{format(new Date(event.traditionalDate), 'EEEE, MMMM do, yyyy')}</p>
                    <p className="text-sm">{event.traditionalVenue}</p>
                  </div>
                  <Countdown targetDate={event.traditionalDate} />
                </div>

                <div className="space-y-4 p-6 rounded-2xl border border-primary/15 bg-card/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">White Wedding</p>
                  <div className="space-y-1 text-muted-foreground font-medium">
                    <p>{format(new Date(event.weddingDate), 'EEEE, MMMM do, yyyy')}</p>
                    <p className="text-sm">{event.weddingVenue}</p>
                  </div>
                  <Countdown targetDate={event.weddingDate} />
                </div>
              </div>

              {event.welcomeMessage && (
                <p className="text-foreground/80 max-w-lg mx-auto italic font-serif text-lg leading-relaxed pt-4">
                  "{event.welcomeMessage}"
                </p>
              )}

              <div className="pt-4">
                <Link href="/rsvp" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-8 h-14 text-lg font-medium shadow-lg hover-elevate bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  RSVP Now
                </Link>
                <p className="text-sm text-muted-foreground mt-4">
                  Kindly respond by {format(new Date(event.rsvpDeadline), 'MMMM do, yyyy')}
                </p>
                <Link href="/gift" className="inline-block text-sm font-medium text-primary hover:underline underline-offset-4 mt-6">
                  Prefer to send a gift instead? →
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
