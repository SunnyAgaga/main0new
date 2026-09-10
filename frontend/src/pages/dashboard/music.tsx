import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetSiteSettings,
  useUpdateSiteSettings,
  getGetSiteSettingsQueryKey,
  useGetSpotifyConfig,
  useUpdateSpotifyConfig,
  getGetSpotifyConfigQueryKey,
  useListSpotifyPlaylists,
  getListSpotifyPlaylistsQueryKey,
  useImportSpotifyPlaylist,
} from '@/api';
import { customFetch, ApiError } from '@/api/custom-fetch';

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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Music, Plus, Trash2, Copy, CheckCircle2, Download, Upload } from 'lucide-react';

function useAudioUpload() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const result = await customFetch<{ url: string }>('/api/admin/uploads/audio', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', file);
          return formData;
        })(),
      });
      return result.url;
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err instanceof ApiError ? (err.data as { error?: string } | null)?.error || err.message : 'An error occurred.',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}

const trackSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z
    .string()
    .min(1, 'URL is required')
    // Accepts both a pasted absolute URL and the relative /api/uploads/:id
    // path returned by the audio upload button below.
    .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), 'Must be a valid URL'),
});

type TrackValues = z.infer<typeof trackSchema>;

const spotifyCredsSchema = z.object({
  clientId: z.string().min(1, 'Required'),
  clientSecret: z.string().min(1, 'Required'),
});
type SpotifyCredsValues = z.infer<typeof spotifyCredsSchema>;

function SpotifyCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: spotify, isLoading } = useGetSpotifyConfig();
  const updateConfig = useUpdateSpotifyConfig();
  const importPlaylist = useImportSpotifyPlaylist();
  const { data: playlists, isFetching: loadingPlaylists } = useListSpotifyPlaylists({
    query: { enabled: Boolean(spotify?.connected), queryKey: getListSpotifyPlaylistsQueryKey() },
  });

  const form = useForm<SpotifyCredsValues>({
    resolver: zodResolver(spotifyCredsSchema),
    defaultValues: { clientId: '', clientSecret: '' },
  });

  const onSaveCreds = (values: SpotifyCredsValues) => {
    updateConfig.mutate({ data: values }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetSpotifyConfigQueryKey(), updated);
        toast({ title: 'Spotify app credentials saved' });
        form.reset({ clientId: '', clientSecret: '' });
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

  const onImport = (playlistId: string, playlistName: string) => {
    importPlaylist.mutate({ playlistId }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetSiteSettingsQueryKey(), updated);
        queryClient.invalidateQueries({ queryKey: getGetSpotifyConfigQueryKey() });
        toast({ title: `Imported "${playlistName}"`, description: `${updated.playlist.length} track preview(s) added.` });
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Import failed',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-serif text-primary flex items-center gap-2">
          Connect Spotify
        </CardTitle>
        <CardDescription>
          Import 30-second track previews from a Spotify playlist. Guests still hear them through your site's
          music button — no Spotify account needed on their end.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSaveCreds)} className="space-y-4">
            {spotify?.configured && (
              <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Spotify app credentials saved.
              </div>
            )}

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input placeholder={spotify?.configured ? 'Leave blank to keep existing' : 'Your Spotify app Client ID'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={spotify?.configured ? 'Leave blank to keep existing' : 'Your Spotify app Client Secret'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 pt-2 border-t border-border">
              <Label>Redirect URI</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={spotify?.redirectUri ?? ''} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (spotify?.redirectUri) {
                      void navigator.clipboard.writeText(spotify.redirectUri);
                      toast({ title: 'Redirect URI copied' });
                    }
                  }}
                  aria-label="Copy redirect URI"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[0.8rem] text-muted-foreground">
                Paste this into your Spotify Developer Dashboard app's Redirect URIs before connecting.
              </p>
              {import.meta.env.DEV && (
                <p className="text-[0.8rem] text-amber-600">
                  In local development, open this dashboard at http://127.0.0.1:{window.location.port} (not localhost) before clicking Connect — Spotify no longer accepts "localhost" and the sign-in cookie needs to match the address Spotify redirects back to.
                </p>
              )}
            </div>

            <Button type="submit" disabled={updateConfig.isPending}>
              {updateConfig.isPending ? 'Saving...' : 'Save Credentials'}
            </Button>
          </form>
        </Form>

        {spotify?.configured && (
          <div className="pt-4 border-t border-border space-y-4">
            {spotify.connected ? (
              <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Connected{spotify.connectedPlaylistName ? ` — last imported "${spotify.connectedPlaylistName}"` : ''}.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected yet.</p>
            )}

            <a href="/api/admin/spotify/connect">
              <Button type="button" variant="outline">
                {spotify.connected ? 'Reconnect Spotify' : 'Connect Spotify'}
              </Button>
            </a>

            {spotify.connected && (
              <div className="space-y-2">
                <Label>Your Playlists</Label>
                {loadingPlaylists ? (
                  <Skeleton className="h-24 rounded-lg" />
                ) : (playlists ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No playlists found on your Spotify account.</p>
                ) : (
                  <div className="space-y-2">
                    {playlists!.map((pl) => (
                      <div key={pl.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{pl.name}</p>
                          <p className="text-xs text-muted-foreground">{pl.trackCount} tracks</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={importPlaylist.isPending}
                          onClick={() => onImport(pl.id, pl.name)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Import
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardMusic() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { upload, uploading } = useAudioUpload();
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<TrackValues>({
    resolver: zodResolver(trackSchema),
    defaultValues: { title: '', url: '' },
  });

  const handleAudioFileSelected = async (file: File) => {
    const url = await upload(file);
    if (!url) return;
    form.setValue('url', url, { shouldValidate: true });
    if (!form.getValues('title')) {
      form.setValue('title', file.name.replace(/\.[^./]+$/, ''));
    }
    toast({ title: 'Audio file uploaded' });
  };

  const save = (playlist: { title: string; url: string }[], musicEnabled: boolean, successMessage: string) => {
    updateSettings.mutate({
      data: {
        musicEnabled,
        playlist,
        logoUrl: settings?.logoUrl ?? '',
        logoHeight: settings?.logoHeight ?? 32,
        heroImageUrl: settings?.heroImageUrl ?? '',
        backgroundColor: settings?.backgroundColor ?? '#fdf9f3',
        primaryColor: settings?.primaryColor ?? '#1c4d3a',
        accentColor: settings?.accentColor ?? '#e3c878',
      },
    }, {
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
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleAudioFileSelected(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                    onClick={() => audioInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading…' : 'Upload an Audio File (max 10MB)'}
                  </Button>
                  <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Adding…' : 'Add Track'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <SpotifyCard />
    </div>
  );
}
