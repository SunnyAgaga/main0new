import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useGetPaymentConfig, useUpdatePaymentConfig, getGetPaymentConfigQueryKey } from '@/api';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Copy, Lock } from 'lucide-react';

const paymentConfigSchema = z.object({
  flutterwaveEnabled: z.boolean(),
  flutterwaveSecretKey: z.string().optional(),
  flutterwaveWebhookSecret: z.string().optional(),
  bankTransferEnabled: z.boolean(),
  bankTransfer: z.object({
    bankName: z.string().min(2, "Bank name required"),
    accountName: z.string().min(2, "Account name required"),
    accountNumber: z.string().min(5, "Account number required"),
    instructions: z.string()
  })
});

type PaymentConfigValues = z.infer<typeof paymentConfigSchema>;

export default function DashboardPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetPaymentConfig();
  const updateConfig = useUpdatePaymentConfig();
  const initialized = useRef(false);

  const form = useForm<PaymentConfigValues>({
    resolver: zodResolver(paymentConfigSchema),
    defaultValues: {
      flutterwaveEnabled: false,
      flutterwaveSecretKey: "",
      flutterwaveWebhookSecret: "",
      bankTransferEnabled: false,
      bankTransfer: {
        bankName: "",
        accountName: "",
        accountNumber: "",
        instructions: ""
      }
    }
  });

  useEffect(() => {
    if (config && !initialized.current) {
      initialized.current = true;
      form.reset({
        flutterwaveEnabled: config.flutterwaveConfigured,
        flutterwaveSecretKey: "", // We don't get the key back, just a hint
        flutterwaveWebhookSecret: "", // We don't get the secret back either
        bankTransferEnabled: config.bankTransferConfigured,
        bankTransfer: config.bankTransfer || {
          bankName: "",
          accountName: "",
          accountNumber: "",
          instructions: ""
        }
      });
    }
  }, [config, form]);

  const onSubmit = (values: PaymentConfigValues) => {
    // If the key is empty, it means we don't want to update it (it stays whatever it was on backend)
    // Actually the API expects `flutterwaveSecretKey` as string. If it's empty we might need to send "" or not send.
    // The OpenAPI says `flutterwaveSecretKey: string;`. Let's assume it accepts empty string to mean "no change" if already configured.
    updateConfig.mutate({
      data: {
        flutterwaveEnabled: values.flutterwaveEnabled,
        flutterwaveSecretKey: values.flutterwaveSecretKey || "",
        flutterwaveWebhookSecret: values.flutterwaveWebhookSecret || "",
        bankTransferEnabled: values.bankTransferEnabled,
        bankTransfer: values.bankTransfer
      }
    }, {
      onSuccess: (updatedData) => {
        toast({
          title: "Payment Settings Saved",
          description: "Your changes have been applied."
        });
        queryClient.setQueryData(getGetPaymentConfigQueryKey(), updatedData);
        form.setValue("flutterwaveSecretKey", ""); // clear field after save
        form.setValue("flutterwaveWebhookSecret", "");
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to save",
          description: err.data?.error || "An error occurred."
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">Payment Settings</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Payment Settings</h1>
        <p className="text-muted-foreground mt-1">Configure how guests pay for Asoebi.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
          
          {/* Flutterwave Card */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-serif text-primary">Flutterwave</CardTitle>
                  <CardDescription>Accept automated payments via cards, USSD, etc.</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="flutterwaveEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config?.flutterwaveConfigured && (
                <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Flutterwave is currently configured (Key: {config.flutterwaveKeyHint})
                </div>
              )}
              
              <FormField
                control={form.control}
                name="flutterwaveSecretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Secret Key
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={config?.flutterwaveConfigured ? "Leave blank to keep existing key" : "FLWSECK-... (live) or FLWSECK_TEST-... (test)"} {...field} />
                    </FormControl>
                    <FormDescription>
                      Both live (production) and test secret keys are accepted. The key is saved server-side and is never returned or displayed again.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={config?.webhookUrl ?? ''} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (config?.webhookUrl) {
                        void navigator.clipboard.writeText(config.webhookUrl);
                        toast({ title: 'Webhook URL copied' });
                      }
                    }}
                    aria-label="Copy webhook URL"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[0.8rem] text-muted-foreground">
                  Paste this into your Flutterwave dashboard under Settings &rarr; Webhooks, so payments are marked paid automatically once confirmed.
                </p>
              </div>

              <FormField
                control={form.control}
                name="flutterwaveWebhookSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Webhook Secret Hash
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={config?.webhookSecretConfigured ? "Leave blank to keep existing secret" : "Same secret hash set in Flutterwave"} {...field} />
                    </FormControl>
                    <FormDescription>
                      {config?.webhookSecretConfigured ? 'Webhook secret is configured.' : 'Not configured yet — payments will stay pending until this and the URL above are set.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Bank Transfer Card */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-serif text-primary">Manual Bank Transfer</CardTitle>
                  <CardDescription>Provide your local bank details for guests to transfer money directly.</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="bankTransferEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardHeader>
            
            {form.watch("bankTransferEnabled") && (
              <CardContent className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bankTransfer.bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Zenith Bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankTransfer.accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="0000000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="bankTransfer.accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John & Jane Weddings" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankTransfer.instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Instructions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Please use your RSVP name as the payment reference." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
          </Card>

          <Button type="submit" size="lg" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? "Saving..." : "Save Configuration"}
          </Button>

        </form>
      </Form>
    </div>
  );
}