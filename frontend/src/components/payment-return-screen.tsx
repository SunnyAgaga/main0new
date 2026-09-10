import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useVerifyCheckout, type OrderStatus } from '@/api';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function isPaymentReturn(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('tx_ref') || params.has('status');
}

/** Shown when Flutterwave redirects the browser back after checkout. */
export function PaymentReturnScreen({ search }: { search: string }) {
  const [, setLocation] = useLocation();
  const verifyMutation = useVerifyCheckout();
  const [result, setResult] = useState<OrderStatus | 'error' | null>(null);
  const attempted = useRef(false);

  const params = new URLSearchParams(search);
  const reference = params.get('tx_ref');
  const transactionId = params.get('transaction_id');
  const status = params.get('status');

  const checkStatus = () => {
    if (!reference || !transactionId) {
      setResult('error');
      return;
    }
    verifyMutation.mutate({ data: { reference, transactionId } }, {
      onSuccess: (order) => setResult(order),
      onError: () => setResult('error'),
    });
  };

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!reference || !transactionId || status === 'cancelled') {
      setResult('error');
      return;
    }

    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!reference || status === 'cancelled') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
            <XCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Payment Cancelled</h1>
          <p className="text-muted-foreground">No charge was made. You can try again anytime.</p>
          <Button onClick={() => setLocation('/')} variant="outline" className="mt-8">Return Home</Button>
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <h1 className="text-2xl font-serif font-bold text-foreground">Confirming your payment…</h1>
          <p className="text-muted-foreground">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  const paid = result !== 'error' && result.status === 'paid';
  const failed = result === 'error' || result.status === 'failed';
  const pending = !paid && !failed;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${paid ? 'bg-primary/10 text-primary' : pending ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
          {paid ? <CheckCircle2 className="w-10 h-10" /> : pending ? <Loader2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          {paid ? 'Payment Successful!' : failed ? 'Payment Failed' : 'Payment Pending'}
        </h1>
        <p className="text-muted-foreground">
          {paid
            ? "Thank you — your payment has been confirmed and your order is complete."
            : failed
              ? "We couldn't confirm this payment. If you were charged, please contact us with your reference."
              : "We're still waiting for confirmation. This can take a minute — check again below if it hasn't updated."}
        </p>
        {result !== 'error' && (
          <p className="text-xs text-muted-foreground font-mono">Reference: {result.reference}</p>
        )}
        <div className="flex flex-col items-center gap-3 mt-8">
          {pending && (
            <Button onClick={checkStatus} disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…
                </>
              ) : (
                'Check Payment Status'
              )}
            </Button>
          )}
          <Button onClick={() => setLocation('/')} variant="outline">Return Home</Button>
        </div>
      </div>
    </div>
  );
}
