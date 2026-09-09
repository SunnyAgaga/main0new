import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useGetSiteSettings, useUpdateSiteSettings, getGetSiteSettingsQueryKey } from '@/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Music, Plus, Trash2 } from 'lucide-react';

const trackSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().min(1, 'URL is required').url('Must be a valid URL'),
});

type TrackValues = z.infer<typeof trackSchema>;

export default function DashboardMusic() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<TrackValues>({
    resolver: zodResolver(trackSchema),
    defaultValues: { title: '', url: '' },
  });

  const save = (playlist: { title: string; url: string }[], musicEnabled: boolean, successMessage: string) => {
    updateSettings.mutate({ data: { musicEnabled, playlist } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetSiteSettingsQueryKey(), updated);
        toast({ title: successMessage });
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not save',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  const onAddTrack = (values: TrackValues) => {
    const playlist = [...(settings?.playlist ?? []), values];
    save(playlist, settings?.musicEnabled ?? false, 'Track added');
    form.reset({ title: '', url: '' });
    setDialogOpen(false);
  };

  const onRemoveTrack = (index: number) => {
    const playlist = (settings?.playlist ?? []).filter((_, i) => i !== index);
    save(playlist, settings?.musicEnabled ?? false, 'Track removed');
  };

  const onToggleEnabled = (musicEnabled: boolean) => {
    save(settings?.playlist ?? [], musicEnabled, musicEnabled ? 'Music enabled' : 'Music disabled');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">Music</h1>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Music</h1>
        <p className="text-muted-foreground mt-1">
          Guests see a music button on the site; clicking it plays your playlist in order.
        </p>
      </div>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-serif text-primary flex items-center gap-2">
                <Music className="w-5 h-5" /> Playlist
              </CardTitle>
              <CardDescription>Add direct links to hosted audio files (MP3, etc.).</CardDescription>
            </div>
            <Switch checked={settings?.musicEnabled ?? false} onCheckedChange={onToggleEnabled} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(settings?.playlist ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tracks yet.</p>
          ) : (
            <div className="space-y-2">
              {settings?.playlist.map((track, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.url}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveTrack(index)}
                    disabled={updateSettings.isPending}
                    aria-label={`Remove ${track.title}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a track</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddTrack)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Our Song" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audio URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/song.mp3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Adding…' : 'Add Track'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
