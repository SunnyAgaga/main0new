import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetRsvpResume,
  useStartFlutterwaveCheckout,
  useCreateBankTransferOrder,
  useCreatePayLaterOrder,
  useGetPaymentMethods,
} from '@/api';
import { BankTransferConfirmation, type BankDetails } from '@/components/bank-transfer-confirmation';
import { PaymentMethodPicker } from '@/components/payment-method-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

export default function ResumePage({ token }: { token: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: resume, isLoading, error } = useGetRsvpResume(token);
  const { data: paymentMethods } = useGetPaymentMethods();
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

  const flutterwaveMutation = useStartFlutterwaveCheckout();
  const bankTransferMutation = useCreateBankTransferOrder();
  const payLaterMutation = useCreatePayLaterOrder();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <Skeleton className="w-full max-w-md h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-2 bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 max-w-sm">
          <p className="font-medium">Link not found</p>
          <p className="text-sm">This payment link may be incorrect or has expired.</p>
        </div>
      </div>
    );
  }

  if (bankDetails) {
    return <BankTransferConfirmation bankDetails={bankDetails} title="Bank Transfer Instructions" />;
  }

  if (resume.existingOrderStatus === 'paid') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full border-none shadow-lg bg-card text-center">
          <CardContent className="p-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-serif font-bold text-foreground">Already paid</h1>
            <p className="text-sm text-muted-foreground">
              Thanks, {resume.guestName} — your Aso Ebi order (ref {resume.existingOrderReference}) is already paid for.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = resume.items;
  const currency = resume.currency;
  const checkoutItems = items.map((item) => ({
    guestName: item.guestName,
    itemId: item.itemId,
    size: item.size,
    quantity: item.quantity,
  }));

  const handleFlutterwave = () => {
    flutterwaveMutation.mutate(
      { data: { rsvpId: resume.rsvpId, guestName: resume.guestName, email: resume.email, items: checkoutItems } },
      {
        onSuccess: (res) => {
          window.location.href = res.checkoutUrl;
        },
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Payment Error',
            description: err.data?.error || 'Could not start Flutterwave checkout.',
          });
        },
      },
    );
  };

  const handleBankTransfer = () => {
    bankTransferMutation.mutate(
      { data: { rsvpId: resume.rsvpId, guestName: resume.guestName, email: resume.email, items: checkoutItems } },
      {
        onSuccess: (res) => setBankDetails(res),
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Transfer Error',
            description: err.data?.error || 'Could not generate bank transfer details.',
          });
        },
      },
    );
  };

  const handlePayLater = () => {
    payLaterMutation.mutate(
      { data: { rsvpId: resume.rsvpId, guestName: resume.guestName, email: resume.email, items: checkoutItems } },
      {
        onSuccess: (res) => {
          toast({
            title: 'Order recorded',
            description: `Reference ${res.reference} — please complete payment before the event.`,
          });
          setLocation('/');
        },
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Could not record order',
            description: err.data?.error || 'An error occurred.',
          });
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background py-12 px-4 sm:px-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-in slide-in-from-bottom-8 duration-700">

        <div className="space-y-6">
          <h2 className="text-3xl font-serif font-bold text-foreground">Complete Your Payment</h2>
          <p className="text-muted-foreground">
            Hi {resume.guestName}, here's your Aso Ebi order — pick a payment method to finish up.
          </p>
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
                        {currency} {item.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{currency} {resume.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
