import { useEffect, useRef, useState } from 'react';
import { useListAdminRsvps, useScanCheckIn, useUpdateRsvpCheckIn, getListAdminRsvpsQueryKey } from '@/api';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Search, CheckCircle2, AlertTriangle, XCircle, Camera, CameraOff } from 'lucide-react';

type EventKey = 'traditional' | 'wedding';

const EVENT_LABEL: Record<EventKey, string> = {
  traditional: 'Traditional Wedding',
  wedding: 'White Wedding',
};

type ScanResult =
  | { kind: 'success'; guestName: string; guestCount: number; event: EventKey; wrongGate: boolean }
  | { kind: 'already'; guestName: string; guestCount: number; event: EventKey; checkedInAt: string | null; wrongGate: boolean }
  | { kind: 'error'; message: string };

function ResultBanner({ result, selectedEvent }: { result: ScanResult; selectedEvent: EventKey }) {
  if (result.kind === 'error') {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
        <XCircle className="w-6 h-6 shrink-0" />
        <p className="font-medium">{result.message}</p>
      </div>
    );
  }

  const tone = result.kind === 'success' && !result.wrongGate ? 'green' : 'amber';
  const classes = tone === 'green'
    ? 'bg-green-50 text-green-800 border-green-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${classes}`}>
      {tone === 'green' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
      <div>
        <p className="font-semibold">
          {result.guestName} {result.guestCount > 1 ? `+ ${result.guestCount - 1} guest${result.guestCount > 2 ? 's' : ''}` : ''}
        </p>
        {result.kind === 'success' && (
          <p className="text-sm">Checked in for {EVENT_LABEL[result.event]}.</p>
        )}
        {result.kind === 'already' && (
          <p className="text-sm">
            Already checked in for {EVENT_LABEL[result.event]}
            {result.checkedInAt ? ` at ${new Date(result.checkedInAt).toLocaleTimeString()}` : ''}.
          </p>
        )}
        {result.wrongGate && (
          <p className="text-sm font-medium mt-1">
            Note: this pass is for {EVENT_LABEL[result.event]}, but you have {EVENT_LABEL[selectedEvent]} selected above.
          </p>
        )}
      </div>
    </div>
  );
}

function ScannerCard({ selectedEvent, onResult }: { selectedEvent: EventKey; onResult: (r: ScanResult) => void }) {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const scanCheckIn = useScanCheckIn();

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelled) return;
      const scanner = new Html5Qrcode('qr-reader-region');
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (busyRef.current) return;
            busyRef.current = true;
            void scanner.pause(true);
            scanCheckIn.mutate({ token: decodedText }, {
              onSuccess: (data) => {
                onResult({
                  kind: data.alreadyCheckedIn ? 'already' : 'success',
                  guestName: data.guestName,
                  guestCount: data.guestCount,
                  event: data.event,
                  checkedInAt: data.checkedInAt,
                  wrongGate: data.event !== selectedEvent,
                });
              },
              onError: () => {
                onResult({ kind: 'error', message: 'Pass not recognized.' });
              },
              onSettled: () => {
                setTimeout(() => {
                  busyRef.current = false;
                  scanner.resume();
                }, 2500);
              },
            });
          },
          () => {},
        );
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : 'Could not access the camera.');
        setCameraOn(false);
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif text-primary flex items-center gap-2">
          <QrCode className="w-5 h-5" /> Scan to Check In
        </CardTitle>
        <CardDescription>Point the camera at the guest's QR code from their pass page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cameraError && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{cameraError}</div>
        )}
        <div
          id="qr-reader-region"
          className={`w-full rounded-xl overflow-hidden bg-black/5 ${cameraOn ? 'min-h-[280px]' : 'h-0'}`}
        />
        <Button type="button" variant={cameraOn ? 'outline' : 'default'} className="w-full" onClick={() => setCameraOn((v) => !v)}>
          {cameraOn ? <CameraOff className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
          {cameraOn ? 'Stop Camera' : 'Start Camera'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ManualCheckIn({ selectedEvent, onResult }: { selectedEvent: EventKey; onResult: (r: ScanResult) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: rsvps, isLoading } = useListAdminRsvps();
  const updateCheckIn = useUpdateRsvpCheckIn();

  const attending = (rsvps ?? []).filter((r) => r.attending);
  const filtered = search.trim()
    ? attending.filter((r) =>
        `${r.guestName} ${r.email}`.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : attending;

  const fieldFor = (event: EventKey) => (event === 'traditional' ? 'traditionalCheckedInAt' : 'weddingCheckedInAt');

  const toggle = (id: number, guestName: string, guestCount: number, currentlyCheckedIn: boolean) => {
    updateCheckIn.mutate({ id, data: { event: selectedEvent, checkedIn: !currentlyCheckedIn } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminRsvpsQueryKey() });
        onResult({
          kind: !currentlyCheckedIn ? 'success' : 'already',
          guestName,
          guestCount,
          event: selectedEvent,
          checkedInAt: new Date().toISOString(),
          wrongGate: false,
        });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Could not update', description: err.data?.error || 'An error occurred.' });
      },
    });
  };

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif text-primary flex items-center gap-2">
          <Search className="w-5 h-5" /> Manual Check-In
        </CardTitle>
        <CardDescription>Fallback for when scanning isn't possible — search by name or email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search guests…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : (
          <div className="max-h-80 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No matching guests.</p>
            ) : (
              filtered.map((r) => {
                const checkedInAt = r[fieldFor(selectedEvent)] as string | null;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.guestName}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email} · {r.guestCount} guest{r.guestCount > 1 ? 's' : ''}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={checkedInAt ? 'outline' : 'default'}
                      disabled={updateCheckIn.isPending}
                      onClick={() => toggle(r.id, r.guestName, r.guestCount, Boolean(checkedInAt))}
                    >
                      {checkedInAt ? 'Undo' : 'Check In'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardCheckIn() {
  const [selectedEvent, setSelectedEvent] = useState<EventKey>('traditional');
  const [result, setResult] = useState<ScanResult | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Guest Check-In</h1>
        <p className="text-muted-foreground mt-1">Scan gate passes as guests arrive, or check them in manually.</p>
      </div>

      <div className="flex gap-2">
        {(['traditional', 'wedding'] as EventKey[]).map((event) => (
          <Button
            key={event}
            type="button"
            variant={selectedEvent === event ? 'default' : 'outline'}
            onClick={() => { setSelectedEvent(event); setResult(null); }}
          >
            {EVENT_LABEL[event]}
          </Button>
        ))}
      </div>

      {result && <ResultBanner result={result} selectedEvent={selectedEvent} />}

      <ScannerCard selectedEvent={selectedEvent} onResult={setResult} />
      <ManualCheckIn selectedEvent={selectedEvent} onResult={setResult} />
    </div>
  );
}
