import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAdminRsvps,
  useGetNotificationConfig,
  useListCampaigns,
  useSendCampaign,
  getListCampaignsQueryKey,
} from '@/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Upload, Send, Mail } from 'lucide-react';

const EMAIL_PATTERN = /[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/g;

export default function DashboardCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rsvps, isLoading: loadingRsvps } = useListAdminRsvps();
  const { data: notificationConfig, isLoading: loadingConfig } = useGetNotificationConfig();
  const { data: campaigns, isLoading: loadingCampaigns } = useListCampaigns();
  const sendCampaign = useSendCampaign();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [extraEmails, setExtraEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const rows = rsvps ?? [];
  const extraEmailList = useMemo(
    () => Array.from(new Set(extraEmails.match(EMAIL_PATTERN) ?? [])),
    [extraEmails],
  );
  const recipientCount = selectedIds.size + extraEmailList.length;

  const toggle = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(rows.map((r) => r.id)));
  const selectAttending = () => setSelectedIds(new Set(rows.filter((r) => r.attending).map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    const found = text.match(EMAIL_PATTERN) ?? [];
    if (found.length === 0) {
      toast({ variant: 'destructive', title: 'No email addresses found in that file' });
      return;
    }
    setExtraEmails((prev) => (prev ? `${prev}\n${found.join(', ')}` : found.join(', ')));
    toast({ title: `Added ${found.length} email${found.length === 1 ? '' : 's'} from file` });
  };

  const emailReady = Boolean(notificationConfig?.emailConfigured && notificationConfig?.emailEnabled);

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Subject and message are required' });
      return;
    }
    if (recipientCount === 0) {
      toast({ variant: 'destructive', title: 'Select at least one recipient' });
      return;
    }
    if (!window.confirm(`Send this email to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }

    sendCampaign.mutate({
      data: {
        subject: subject.trim(),
        message: message.trim(),
        rsvpIds: Array.from(selectedIds),
        extraEmails: extraEmailList,
      },
    }, {
      onSuccess: (campaign) => {
        void queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        toast({
          title: 'Campaign sent',
          description: `${campaign.sentCount} delivered, ${campaign.failedCount} failed, out of ${campaign.recipientCount}.`,
        });
        setSubject('');
        setMessage('');
        setExtraEmails('');
        clearSelection();
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not send campaign',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  if (loadingRsvps || loadingConfig) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">Campaigns</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Campaigns</h1>
        <p className="text-muted-foreground mt-1">Send a bulk email update to your guests via Mailgun.</p>
      </div>

      {!emailReady && (
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Email isn't configured yet. Go to <strong>Notifications</strong> to connect Mailgun and enable email before sending a campaign.
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-serif text-primary">Recipients</CardTitle>
          <CardDescription>Pick guests from your RSVP list, or add other addresses below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>Select All</Button>
            <Button type="button" variant="outline" size="sm" onClick={selectAttending}>Select Attending Only</Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
          </div>

          <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No RSVPs yet.</p>
            ) : (
              rows.map((rsvp) => (
                <label key={rsvp.id} className="flex items-center gap-3 p-3 cursor-pointer hover-elevate">
                  <Checkbox
                    checked={selectedIds.has(rsvp.id)}
                    onCheckedChange={(checked) => toggle(rsvp.id, checked === true)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{rsvp.guestName}</p>
                    <p className="text-xs text-muted-foreground truncate">{rsvp.email}</p>
                  </div>
                  {!rsvp.attending && (
                    <span className="text-xs text-muted-foreground shrink-0">Declined</span>
                  )}
                </label>
              ))
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium">Other Email Addresses</label>
            <Textarea
              rows={3}
              placeholder="jane@example.com, john@example.com"
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleFileUpload(file);
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />
                Upload a List (.csv/.txt)
              </Button>
              <p className="text-xs text-muted-foreground">Any email addresses found in the file are added above.</p>
            </div>
          </div>

          <p className="text-sm font-medium text-foreground pt-2">
            {recipientCount} recipient{recipientCount === 1 ? '' : 's'} selected
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-serif text-primary flex items-center gap-2">
            <Mail className="w-5 h-5" /> Message
          </CardTitle>
          <CardDescription>What you'd like to share with your guests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input placeholder="An update about our big day" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              rows={8}
              placeholder="Dear friends and family, ..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="lg"
            disabled={!emailReady || sendCampaign.isPending}
            onClick={handleSend}
          >
            <Send className="w-4 h-4 mr-2" />
            {sendCampaign.isPending ? 'Sending…' : `Send to ${recipientCount} Recipient${recipientCount === 1 ? '' : 's'}`}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-foreground">Past Campaigns</h2>
        <Card className="border-none shadow-sm overflow-hidden">
          {loadingCampaigns ? (
            <CardContent className="p-6">
              <Skeleton className="h-24 rounded-lg" />
            </CardContent>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaigns ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No campaigns sent yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns!.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.subject}</TableCell>
                      <TableCell>{c.recipientCount}</TableCell>
                      <TableCell className="text-green-700">{c.sentCount}</TableCell>
                      <TableCell className={c.failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}>{c.failedCount}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
