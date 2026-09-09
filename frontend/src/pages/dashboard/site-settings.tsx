import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetEvent,
  useUpdateEvent,
  getGetEventQueryKey,
  useGetSiteSettings,
  useUpdateSiteSettings,
  getGetSiteSettingsQueryKey,
} from '@/api';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const eventSchema = z.object({
  coupleNames: z.string().min(1, 'Required'),
  traditionalDate: z.string().min(1, 'Required'),
  traditionalVenue: z.string().min(1, 'Required'),
  weddingDate: z.string().min(1, 'Required'),
  weddingVenue: z.string().min(1, 'Required'),
  rsvpDeadline: z.string().min(1, 'Required'),
  welcomeMessage: z.string().min(1, 'Required'),
});
type EventValues = z.infer<typeof eventSchema>;

const themeSchema = z.object({
  logoUrl: z.string(),
  heroImageUrl: z.string(),
  backgroundColor: z.string().min(1),
  primaryColor: z.string().min(1),
  accentColor: z.string().min(1),
});
type ThemeValues = z.infer<typeof themeSchema>;

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function EventDetailsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useGetEvent();
  const updateEvent = useUpdateEvent();
  const initialized = useRef(false);

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      coupleNames: '',
      traditionalDate: '',
      traditionalVenue: '',
      weddingDate: '',
      weddingVenue: '',
      rsvpDeadline: '',
      welcomeMessage: '',
    },
  });

  useEffect(() => {
    if (event && !initialized.current) {
      initialized.current = true;
      form.reset({
        coupleNames: event.coupleNames,
        traditionalDate: toDateTimeLocal(event.traditionalDate),
        traditionalVenue: event.traditionalVenue,
        weddingDate: toDateTimeLocal(event.weddingDate),
        weddingVenue: event.weddingVenue,
        rsvpDeadline: toDateInput(event.rsvpDeadline),
        welcomeMessage: event.welcomeMessage,
      });
    }
  }, [event, form]);

  const onSubmit = (values: EventValues) => {
    updateEvent.mutate({
      data: {
        ...values,
        traditionalDate: new Date(values.traditionalDate).toISOString(),
        weddingDate: new Date(values.weddingDate).toISOString(),
      },
    }, {
      onSuccess: (updated) => {
        toast({ title: 'Home page updated' });
        queryClient.setQueryData(getGetEventQueryKey(), updated);
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

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="border-none shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-primary">Home Page Content</CardTitle>
            <CardDescription>Couple names, dates, venues and welcome message shown to guests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="coupleNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couple Names</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tola & Dami" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="traditionalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traditional Wedding Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="traditionalVenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traditional Wedding Venue</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weddingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>White Wedding Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weddingVenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>White Wedding Venue</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rsvpDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSVP Deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="welcomeMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome Message</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Shown as a quote beneath the countdown on the home page.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={updateEvent.isPending}>
          {updateEvent.isPending ? 'Saving...' : 'Save Home Page Content'}
        </Button>
      </form>
    </Form>
  );
}

function LookAndFeelCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const initialized = useRef(false);

  const form = useForm<ThemeValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      logoUrl: '',
      heroImageUrl: '',
      backgroundColor: '#fdf9f3',
      primaryColor: '#1c4d3a',
      accentColor: '#e3c878',
    },
  });

  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      form.reset({
        logoUrl: settings.logoUrl,
        heroImageUrl: settings.heroImageUrl,
        backgroundColor: settings.backgroundColor,
        primaryColor: settings.primaryColor,
        accentColor: settings.accentColor,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: ThemeValues) => {
    updateSettings.mutate({
      data: {
        musicEnabled: settings?.musicEnabled ?? false,
        playlist: settings?.playlist ?? [],
        ...values,
      },
    }, {
      onSuccess: (updated) => {
        toast({ title: 'Look & feel updated' });
        queryClient.setQueryData(getGetSiteSettingsQueryKey(), updated);
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

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="border-none shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-primary">Look &amp; Feel</CardTitle>
            <CardDescription>Logo, hero image and colors used across the site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/logo.png" {...field} />
                  </FormControl>
                  <FormDescription>Leave blank to use the default WedPlan logo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="heroImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hero Background Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/hero.jpg" {...field} />
                  </FormControl>
                  <FormDescription>Shown behind the countdown on the home page. Leave blank for none.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="backgroundColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-9 w-12 rounded border border-input cursor-pointer"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Input {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-9 w-12 rounded border border-input cursor-pointer"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Input {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-9 w-12 rounded border border-input cursor-pointer"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Input {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? 'Saving...' : 'Save Look & Feel'}
        </Button>
      </form>
    </Form>
  );
}

export default function DashboardSiteSettings() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Site Settings</h1>
        <p className="text-muted-foreground mt-1">Edit everything shown on your public home page.</p>
      </div>

      <EventDetailsCard />
      <LookAndFeelCard />
    </div>
  );
}
