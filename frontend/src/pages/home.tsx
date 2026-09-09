import { Link } from 'wouter';
import { useGetEvent, useGetSiteSettings } from '@/api';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Countdown } from '@/components/countdown';
import { Monogram, getMonogramInitials } from '@/components/monogram';

export default function Home() {
  const { data: event, isLoading, error } = useGetEvent();
  const { data: settings } = useGetSiteSettings();
  const logoSrc = settings?.logoUrl || `${import.meta.env.BASE_URL}logo.svg`;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {settings?.heroImageUrl ? (
        <>
          <div
            className="absolute inset-0 pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url(${settings.heroImageUrl})` }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, hsl(var(--background) / 0.55) 0%, hsl(var(--background) / 0.88) 55%, hsl(var(--background)) 100%)',
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage:
            'radial-gradient(circle at top right, hsl(var(--accent)), transparent 55%), radial-gradient(circle at bottom left, hsl(var(--primary)), transparent 55%)',
        }} />
      )}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <Monogram
          initials={getMonogramInitials(event?.coupleNames ?? 'Wed & Plan')}
          className="w-[420px] md:w-[600px] h-auto text-primary opacity-[0.05]"
        />
      </div>

      <header className="w-full flex items-center p-6 lg:px-12 relative z-10">
        <div className="flex items-center gap-2">
          <img src={logoSrc} alt="Logo" style={{ height: settings?.logoHeight ?? 32 }} className="object-contain" />
        </div>
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
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/rsvp" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-8 h-14 text-lg font-medium shadow-lg hover-elevate bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    RSVP Now
                  </Link>
                  <Link href="/gift" className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-8 h-14 text-lg font-medium border border-primary/30 text-primary hover-elevate hover:bg-primary/5 transition-colors">
                    Send a Gift
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Kindly respond by {format(new Date(event.rsvpDeadline), 'MMMM do, yyyy')}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
