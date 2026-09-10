import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useStartGiftFlutterwaveCheckout,
  useCreateGiftBankTransferOrder,
  useGetEvent,
} from '@/api';
import { PaymentReturnScreen, isPaymentReturn } from '@/components/payment-return-screen';

import { Gift, CreditCard, Landmark, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const giftSchema = z.object({
  guestName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  amount: z.coerce.number().min(1000, 'Minimum gift amount is NGN 1,000'),
  message: z.string().optional(),
});

type GiftFormValues = z.infer<typeof giftSchema>;

const SUGGESTED_AMOUNTS = [10000, 25000, 50000, 100000];

export default function GiftPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { data: event } = useGetEvent();

  const flutterwaveMutation = useStartGiftFlutterwaveCheckout();
  const bankTransferMutation = useCreateGiftBankTransferOrder();

  const [bankDetails, setBankDetails] = useState<{
    reference: string;
    amount: number;
    currency: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions: string;
  } | null>(null);

  const form = useForm<GiftFormValues>({
    resolver: zodResolver(giftSchema),
    defaultValues: { guestName: '', email: '', message: '' },
  });

  useEffect(() => {
    const raw = sessionStorage.getItem('wedplan_gift_prefill');
    if (!raw) return;
    sessionStorage.removeItem('wedplan_gift_prefill');
    try {
      const prefill = JSON.parse(raw) as { guestName: string; email: string; amount: number };
      form.reset({ guestName: prefill.guestName, email: prefill.email, amount: prefill.amount, message: '' });
    } catch {
      // ignore malformed prefill data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFlutterwave = form.handleSubmit((values) => {
    flutterwaveMutation.mutate({ data: values }, {
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
    });
  });

  const handleBankTransfer = form.handleSubmit((values) => {
    bankTransferMutation.mutate({ data: values }, {
      onSuccess: (res) => setBankDetails(res),
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Transfer Error',
          description: err.data?.error || 'Could not generate bank transfer details.',
        });
      },
    });
  });

  if (isPaymentReturn(search)) {
    return <PaymentReturnScreen search={search} />;
  }

  if (bankDetails) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-lg w-full border-none shadow-xl bg-card animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Landmark className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">Thank You For Your Gift</CardTitle>
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
    <div className="min-h-[100dvh] bg-background py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div>
          <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back Home
          </Button>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2">
              <Gift className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground">Send a Gift</h1>
            {event && (
              <p className="text-muted-foreground">
                Your love and support mean the world to {event.coupleNames}.
              </p>
            )}
          </div>
        </div>

        <Card className="border-none shadow-xl bg-card">
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="guestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jane@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gift Amount (NGN)</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {SUGGESTED_AMOUNTS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => field.onChange(amount)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              field.value === amount
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'border-border text-muted-foreground hover-elevate'
                            }`}
                          >
                            {amount.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <FormControl>
                        <Input type="number" min="1000" placeholder="Enter a custom amount" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Wishing you a lifetime of love and happiness!" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full h-14 text-lg rounded-xl"
                    disabled={flutterwaveMutation.isPending}
                    onClick={handleFlutterwave}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    {flutterwaveMutation.isPending ? 'Redirecting…' : 'Pay Online (Flutterwave)'}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="w-full h-14 text-lg rounded-xl"
                    disabled={bankTransferMutation.isPending}
                    onClick={handleBankTransfer}
                  >
                    <Landmark className="w-5 h-5 mr-2" />
                    {bankTransferMutation.isPending ? 'Generating…' : 'Pay by Bank Transfer'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
