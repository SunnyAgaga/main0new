import { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useGetDeliveryConfig, useUpdateDeliveryConfig, getGetDeliveryConfigQueryKey } from '@/api';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Copy, Lock, Plus, Trash2, Truck } from 'lucide-react';

const deliveryProviderSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Required'),
  fee: z.coerce.number().min(0),
  enabled: z.boolean(),
});

const deliveryConfigSchema = z.object({
  deliveryEnabled: z.boolean(),
  providerName: z.string(),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  pickupLocation: z.string(),
  deliveryFee: z.coerce.number().min(0),
  providers: z.array(deliveryProviderSchema),
});

type DeliveryConfigValues = z.infer<typeof deliveryConfigSchema>;

export default function DashboardDelivery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetDeliveryConfig();
  const updateConfig = useUpdateDeliveryConfig();
  const initialized = useRef(false);

  const form = useForm<DeliveryConfigValues>({
    resolver: zodResolver(deliveryConfigSchema),
    defaultValues: {
      deliveryEnabled: false,
      providerName: '',
      apiKey: '',
      webhookSecret: '',
      pickupLocation: '',
      deliveryFee: 0,
      providers: [],
    },
  });

  const providerFields = useFieldArray({ control: form.control, name: 'providers' });

  useEffect(() => {
    if (config && !initialized.current) {
      initialized.current = true;
      form.reset({
        deliveryEnabled: config.deliveryEnabled,
        providerName: config.providerName,
        apiKey: '',
        webhookSecret: '',
        pickupLocation: config.pickupLocation,
        deliveryFee: config.deliveryFee,
        providers: config.providers,
      });
    }
  }, [config, form]);

  const onSubmit = (values: DeliveryConfigValues) => {
    updateConfig.mutate({
      data: {
        deliveryEnabled: values.deliveryEnabled,
        providerName: values.providerName,
        apiKey: values.apiKey || '',
        webhookSecret: values.webhookSecret || '',
        pickupLocation: values.pickupLocation,
        deliveryFee: values.deliveryFee,
        providers: values.providers,
      },
    }, {
      onSuccess: (updated) => {
        toast({ title: 'Delivery Settings Saved' });
        queryClient.setQueryData(getGetDeliveryConfigQueryKey(), updated);
        form.setValue('apiKey', '');
        form.setValue('webhookSecret', '');
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Failed to save',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">Delivery Settings</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Delivery Settings</h1>
        <p className="text-muted-foreground mt-1">Configure pickup and delivery for Asoebi orders.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-serif text-primary">Delivery Integration</CardTitle>
                  <CardDescription>Enable delivery and connect a logistics provider.</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="deliveryEnabled"
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
              {config?.providerConfigured && (
                <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {config.providerName} is configured.
                </div>
              )}

              <FormField
                control={form.control}
                name="providerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. GIG Logistics, Kwik, Sendbox" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      API Key
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={config?.providerConfigured ? 'Leave blank to keep existing key' : 'Your provider API key'} {...field} />
                    </FormControl>
                    <FormDescription>
                      Stored server-side, never returned or displayed again. No real shipments are created yet until this provider's API is wired up.
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
                  Placeholder endpoint — ready to receive delivery status updates once your provider's webhook format is wired up.
                </p>
              </div>

              <FormField
                control={form.control}
                name="webhookSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Webhook Secret
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={config?.webhookSecretConfigured ? 'Leave blank to keep existing secret' : 'A shared secret for verifying webhook calls'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-primary flex items-center gap-2">
                <Truck className="w-5 h-5" /> Delivery Options
              </CardTitle>
              <CardDescription>
                Named delivery services guests can choose from, e.g. Bolt, Dellyman, GIG Logistics — each with its own fee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {providerFields.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">No delivery options yet.</p>
              ) : (
                <div className="space-y-3">
                  {providerFields.fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-3 p-3 rounded-lg border border-border bg-background">
                      <FormField
                        control={form.control}
                        name={`providers.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Bolt" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`providers.${index}.fee`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel>Fee (NGN)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`providers.${index}.enabled`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col items-center gap-2">
                            <FormLabel>Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => providerFields.remove(index)}
                        aria-label="Remove delivery option"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  providerFields.append({ id: crypto.randomUUID(), name: '', fee: 0, enabled: true })
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Delivery Option
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-primary">Pickup &amp; Fees</CardTitle>
              <CardDescription>Shown to guests who choose pickup instead of delivery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="pickupLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Location / Instructions</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. The Monarch Event Centre, front desk, weekdays 9am-5pm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Fee (NGN)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormDescription>Set to 0 for free delivery.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
