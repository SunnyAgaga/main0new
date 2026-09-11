import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { useGetRsvpPass } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Ticket } from 'lucide-react';

export default function PassPage({ token }: { token: string }) {
  const { data: pass, isLoading, error } = useGetRsvpPass(token);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !token || !pass) return;
    setQrReady(false);
    QRCode.toCanvas(canvasRef.current, token, { width: 240, margin: 1 })
      .then(() => setQrReady(true))
      .catch(() => setQrReady(false));
  }, [token, pass]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 mx-auto rounded-full" />
            <Skeleton className="h-64 w-64 mx-auto rounded-2xl" />
            <Skeleton className="h-4 w-40 mx-auto rounded-full" />
          </div>
        ) : error || !pass ? (
          <div className="text-center space-y-2 bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20">
            <p className="font-medium">Pass not found</p>
            <p className="text-sm">This link may be incorrect or the RSVP no longer exists.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary text-primary-foreground text-center py-5">
              <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest opacity-90">
                <Ticket className="w-4 h-4" />
                Gate Pass
              </div>
              <h1 className="text-xl font-serif mt-1">
                {pass.event === 'traditional' ? 'Traditional Wedding' : 'White Wedding'}
              </h1>
            </div>

            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <canvas ref={canvasRef} className={qrReady ? '' : 'opacity-0'} />

              <div>
                <p className="font-serif text-2xl text-foreground">{pass.guestName}</p>
                <p className="text-sm text-muted-foreground">
                  {pass.guestCount > 1 ? `Party of ${pass.guestCount}` : '1 guest'}
                </p>
              </div>

              <div className="w-full border-t border-border pt-4 text-sm text-muted-foreground space-y-1">
                {pass.eventDate && <p>{format(new Date(pass.eventDate), 'EEEE, MMMM do, yyyy · h:mm a')}</p>}
                {pass.eventVenue && <p>{pass.eventVenue}</p>}
              </div>

              {pass.alreadyCheckedIn && (
                <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 text-sm font-medium py-2 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  Checked in{pass.checkedInAt ? ` at ${format(new Date(pass.checkedInAt), 'h:mm a')}` : ''}
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2">
                Show this QR code at the entrance to be checked in.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
