import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStartFlutterwaveCheckout, useCreateBankTransferOrder, type RsvpResult } from '@/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Landmark, ArrowLeft } from 'lucide-react';

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rsvpData, setRsvpData] = useState<RsvpResult | null>(null);

  const flutterwaveMutation = useStartFlutterwaveCheckout();
  const bankTransferMutation = useCreateBankTransferOrder();

  const [bankDetails, setBankDetails] = useState<{
    reference: string;
    amount: number;
    currency: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('wedplan_rsvp');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RsvpResult;
        if (parsed.nextStep !== 'cart' || !parsed.cartItems || parsed.cartItems.length === 0) {
          setLocation('/');
        } else {
          setRsvpData(parsed);
        }
      } catch {
        setLocation('/');
      }
    } else {
      setLocation('/');
    }
  }, [setLocation]);

  if (!rsvpData || !rsvpData.cartItems || rsvpData.cartItems.length === 0) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <Skeleton className="w-full max-w-md h-64 rounded-xl" />
      </div>
    );
  }

  const items = rsvpData.cartItems;
  const currency = items[0].currency;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkoutItems = items.map((item) => ({
    guestName: item.guestName,
    itemId: item.asoebiItemId,
    size: item.size,
  }));

  const handleFlutterwave = () => {
    flutterwaveMutation.mutate({
      data: {
        rsvpId: rsvpData.id,
        guestName: rsvpData.guestName,
        email: rsvpData.email,
        items: checkoutItems,
      }
    }, {
      onSuccess: (res) => {
        window.location.href = res.checkoutUrl;
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: err.data?.error || "Could not start Flutterwave checkout."
        });
      }
    });
  };

  const handleBankTransfer = () => {
    bankTransferMutation.mutate({
      data: {
        rsvpId: rsvpData.id,
        guestName: rsvpData.guestName,
        email: rsvpData.email,
        items: checkoutItems,
      }
    }, {
      onSuccess: (res) => {
        setBankDetails(res);
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Transfer Error",
          description: err.data?.error || "Could not generate bank transfer details."
        });
      }
    });
  };

  if (bankDetails) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-lg w-full border-none shadow-xl bg-card animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Landmark className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">Bank Transfer Instructions</CardTitle>
            <CardDescription>
              Please transfer exactly <strong>{bankDetails.currency} {bankDetails.amount.toLocaleString()}</strong> to the account below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground text-sm">Bank Name</span>
                <span className="font-semibold">{bankDetails.bankName}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground text-sm">Account Name</span>
                <span className="font-semibold">{bankDetails.accountName}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground text-sm">Account Number</span>
                <span className="font-mono font-bold tracking-wider">{bankDetails.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Reference</span>
                <span className="font-mono text-primary font-bold">{bankDetails.reference}</span>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground bg-primary/5 p-3 rounded text-primary">
              {bankDetails.instructions}
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-12" onClick={() => setLocation('/')}>
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background py-12 px-4 sm:px-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-in slide-in-from-bottom-8 duration-700">

        {/* Order Summary */}
        <div className="space-y-6">
          <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Cancel & Return
          </Button>
          <h2 className="text-3xl font-serif font-bold text-foreground">Order Summary</h2>
          <Card className="border-none shadow-lg bg-card overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map((item, index) => (
                  <div key={index} className="p-6 bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          For {item.guestName} &bull; Size: {item.size} &bull; Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="font-semibold text-primary whitespace-nowrap">
                        {item.currency} {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  <span>{currency} {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-4">
                  <span>Total</span>
                  <span className="text-primary">{currency} {total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {rsvpData.deliveryMethod && (
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground">
                  {rsvpData.deliveryMethod === 'delivery'
                    ? `Delivery${rsvpData.deliveryProvider ? ` via ${rsvpData.deliveryProvider}` : ''}`
                    : 'Pickup'}
                </p>
                {rsvpData.deliveryMethod === 'delivery' && rsvpData.deliveryAddress && (
                  <p className="text-sm text-muted-foreground mt-1">{rsvpData.deliveryAddress}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Options */}
        <div className="space-y-6 md:pt-14">
          <h2 className="text-xl font-serif font-bold text-foreground">Payment Method</h2>
          <div className="space-y-4">

            <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={handleFlutterwave}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F5A623]/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-[#F5A623]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Pay online (Flutterwave)</h4>
                  <p className="text-sm text-muted-foreground">Instant confirmation via Card, USSD, or Bank Transfer</p>
                </div>
                {flutterwaveMutation.isPending ? (
                  <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : null}
              </CardContent>
            </Card>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm font-medium">OR</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={handleBankTransfer}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Landmark className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Manual Bank Transfer</h4>
                  <p className="text-sm text-muted-foreground">We will verify your payment manually</p>
                </div>
                {bankTransferMutation.isPending ? (
                  <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : null}
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}
