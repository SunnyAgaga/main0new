import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetNotificationConfig,
  useUpdateNotificationConfig,
  useSendTestEmail,
  getGetNotificationConfigQueryKey,
} from '@/api';
import { useAuth } from '@/lib/auth';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Lock, Send } from 'lucide-react';

const notificationConfigSchema = z.object({
  emailEnabled: z.boolean(),
  mailgunApiKey: z.string().optional(),
  mailgunDomain: z.string(),
  mailgunFromEmail: z.string(),
  smsEnabled: z.boolean(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioFromNumber: z.string(),
});

type NotificationConfigValues = z.infer<typeof notificationConfigSchema>;

export default function DashboardNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: config, isLoading } = useGetNotificationConfig();
  const updateConfig = useUpdateNotificationConfig();
  const sendTestEmail = useSendTestEmail();
  const initialized = useRef(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  const form = useForm<NotificationConfigValues>({
    resolver: zodResolver(notificationConfigSchema),
    defaultValues: {
      emailEnabled: false,
      mailgunApiKey: '',
      mailgunDomain: '',
      mailgunFromEmail: '',
      smsEnabled: false,
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioFromNumber: '',
    },
  });

  useEffect(() => {
    if (config && !initialized.current) {
      initialized.current = true;
      form.reset({
        emailEnabled: config.emailEnabled,
        mailgunApiKey: '',
        mailgunDomain: config.mailgunDomain,
        mailgunFromEmail: config.mailgunFromEmail,
        smsEnabled: config.smsEnabled,
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioFromNumber: config.twilioFromNumber,
      });
    }
  }, [config, form]);

  useEffect(() => {
    if (user?.email && !testEmailAddress) setTestEmailAddress(user.email);
  }, [user, testEmailAddress]);

  const handleSendTestEmail = () => {
    const to = testEmailAddress.trim();
    if (!to) {
      toast({ variant: 'destructive', title: 'Enter an email address to send the test to' });
      return;
    }
    sendTestEmail.mutate({ data: { to } }, {
      onSuccess: (result) => {
        toast(
          result.delivered
            ? { title: 'Test email sent', description: `Delivered to ${to}.` }
            : { variant: 'destructive', title: 'Test email failed', description: 'Mailgun rejected the request — check your API key and domain.' },
        );
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not send test email',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  const onSubmit = (values: NotificationConfigValues) => {
    updateConfig.mutate({
      data: {
        emailEnabled: values.emailEnabled,
        mailgunApiKey: values.mailgunApiKey || '',
        mailgunDomain: values.mailgunDomain,
        mailgunFromEmail: values.mailgunFromEmail,
        smsEnabled: values.smsEnabled,
        twilioAccountSid: values.twilioAccountSid || '',
        twilioAuthToken: values.twilioAuthToken || '',
        twilioFromNumber: values.twilioFromNumber,
      },
    }, {
      onSuccess: (updated) => {
        toast({ title: 'Notification Settings Saved' });
        queryClient.setQueryData(getGetNotificationConfigQueryKey(), updated);
        form.setValue('mailgunApiKey', '');
        form.setValue('twilioAccountSid', '');
        form.setValue('twilioAuthToken', '');
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
        <h1 className="text-3xl font-serif font-bold">Notifications</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Connect email and SMS providers. These credentials are stored and ready — no messages are sent automatically yet.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
          {/* Email (Mailgun) */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-serif text-primary">Email (Mailgun)</CardTitle>
                  <CardDescription>Send email notifications via Mailgun.</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="emailEnabled"
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
              {config?.emailConfigured && (
                <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Mailgun is configured.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mailgunDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="mg.yourdomain.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mailgunFromEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="wedding@yourdomain.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="mailgunApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      API Key
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={config?.emailConfigured ? 'Leave blank to keep existing key' : 'key-...'} {...field} />
                    </FormControl>
                    <FormDescription>
                      Stored server-side, never returned or displayed again.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {config?.emailConfigured && (
                <div className="pt-2 border-t border-border space-y-2">
                  <label className="text-sm font-medium leading-none">Send a Test Email</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={sendTestEmail.isPending || !config.emailEnabled}
                      onClick={handleSendTestEmail}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendTestEmail.isPending ? 'Sending…' : 'Send Test Email'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.emailEnabled
                      ? 'Confirms your saved Mailgun configuration can actually deliver mail.'
                      : 'Turn on email above and save to enable test sending.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SMS (Twilio) */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-serif text-primary">SMS (Twilio)</CardTitle>
                  <CardDescription>Send SMS notifications via Twilio.</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="smsEnabled"
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
              {config?.smsConfigured && (
                <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Twilio is configured.
                </div>
              )}
              <FormField
                control={form.control}
                name="twilioFromNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+15551234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="twilioAccountSid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Account SID
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={config?.smsConfigured ? 'Leave blank to keep existing' : 'AC...'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="twilioAuthToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Auth Token
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={config?.smsConfigured ? 'Leave blank to keep existing' : 'Your auth token'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
