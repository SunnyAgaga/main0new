import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useStartFlutterwaveCheckout, useCreateBankTransferOrder, useCreatePayLaterOrder, useGetPaymentMethods, type RsvpResult } from '@/api';
import { PaymentReturnScreen, isPaymentReturn } from '@/components/payment-return-screen';
import { BankTransferConfirmation, type BankDetails } from '@/components/bank-transfer-confirmation';
import { PaymentMethodPicker } from '@/components/payment-method-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Gift } from 'lucide-react';

interface GiftPrefill {
  guestName: string;
  email: string;
  amount: number;
}

export default function CartPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [rsvpData, setRsvpData] = useState<RsvpResult | null>(null);
  const [giftPrefill, setGiftPrefill] = useState<GiftPrefill | null>(null);

  const flutterwaveMutation = useStartFlutterwaveCheckout();
  const bankTransferMutation = useCreateBankTransferOrder();
  const payLaterMutation = useCreatePayLaterOrder();
  const { data: paymentMethods } = useGetPaymentMethods();

  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

  const paymentReturn = isPaymentReturn(search);

  useEffect(() => {
    if (paymentReturn) return;
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

    const rawGift = sessionStorage.getItem('wedplan_gift_prefill');
    if (rawGift) {
      try {
        setGiftPrefill(JSON.parse(rawGift) as GiftPrefill);
      } catch {
        // ignore malformed prefill data
      }
    }
  }, [setLocation]);

  if (paymentReturn) {
    return <PaymentReturnScreen search={search} />;
  }

  if (!rsvpData || !rsvpData.cartItems || rsvpData.cartItems.length === 0) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <Skeleton className="w-full max-w-md h-64 rounded-xl" />
      </div>
    );
  }

  const items = rsvpData.cartItems;
  const currency = items[0].currency;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const giftAmount = giftPrefill?.amount ?? 0;
  const total = subtotal + giftAmount;

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
        giftAmount: giftAmount || undefined,
      }
    }, {
      onSuccess: (res) => {
        sessionStorage.removeItem('wedplan_gift_prefill');
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
        giftAmount: giftAmount || undefined,
      }
    }, {
      onSuccess: (res) => {
        sessionStorage.removeItem('wedplan_gift_prefill');
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

  const handlePayLater = () => {
    payLaterMutation.mutate({
      data: {
        rsvpId: rsvpData.id,
        guestName: rsvpData.guestName,
        email: rsvpData.email,
        items: checkoutItems,
        giftAmount: giftAmount || undefined,
      }
    }, {
      onSuccess: (res) => {
        sessionStorage.removeItem('wedplan_rsvp');
        sessionStorage.removeItem('wedplan_gift_prefill');
        toast({
          title: 'Order recorded',
          description: `Reference ${res.reference} — please complete payment before the event.`,
        });
        setLocation('/');
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Could not record order",
          description: err.data?.error || "An error occurred."
        });
      }
    });
  };

  if (bankDetails) {
    return <BankTransferConfirmation bankDetails={bankDetails} title="Bank Transfer Instructions" />;
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
                  <span>{currency} {subtotal.toLocaleString()}</span>
                </div>
                {giftAmount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Gift</span>
                    <span>{currency} {giftAmount.toLocaleString()}</span>
                  </div>
                )}
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
          <PaymentMethodPicker
            paymentMethods={paymentMethods}
            onFlutterwave={handleFlutterwave}
            onBankTransfer={handleBankTransfer}
            onPayLater={handlePayLater}
            isFlutterwavePending={flutterwaveMutation.isPending}
            isBankTransferPending={bankTransferMutation.isPending}
            isPayLaterPending={payLaterMutation.isPending}
          />
        </div>

      </div>
    </div>
  );
}
