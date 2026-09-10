import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAdminRsvps,
  useUpdateAdminRsvp,
  getListAdminRsvpsQueryKey,
  useListAsoebi,
  type AdminRsvp,
  type AsoebiItem,
} from '@/api';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Pencil, FileSpreadsheet, FileText } from 'lucide-react';

const EXPORT_COLUMNS: { key: string; label: string; get: (rsvp: AdminRsvp) => string | number }[] = [
  { key: 'guestName', label: 'Guest', get: (r) => r.guestName },
  { key: 'email', label: 'Email', get: (r) => r.email },
  { key: 'phone', label: 'Phone', get: (r) => r.phone ?? '' },
  { key: 'attending', label: 'Attending', get: (r) => (r.attending ? 'Yes' : 'No') },
  { key: 'guestCount', label: 'Guest Count', get: (r) => r.guestCount },
  { key: 'asoebiInterest', label: 'Asoebi Interest', get: (r) => r.asoebiInterest },
  { key: 'deliveryMethod', label: 'Delivery Method', get: (r) => r.deliveryMethod ?? '' },
  { key: 'deliveryProvider', label: 'Delivery Provider', get: (r) => r.deliveryProvider ?? '' },
  { key: 'deliveryAddress', label: 'Delivery Address', get: (r) => r.deliveryAddress ?? '' },
  { key: 'note', label: 'Note', get: (r) => r.note ?? '' },
  { key: 'createdAt', label: 'Date', get: (r) => r.createdAt },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function exportRsvpsCsv(rsvps: AdminRsvp[]) {
  const header = EXPORT_COLUMNS.map((c) => c.label).join(',');
  const rows = rsvps.map((rsvp) => EXPORT_COLUMNS.map((c) => escapeCsvCell(c.get(rsvp))).join(','));
  const csv = [header, ...rows].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `rsvps-${Date.now()}.csv`);
}

async function exportRsvpsPdf(rsvps: AdminRsvp[]) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('RSVPs', 14, 15);

  autoTable(doc, {
    startY: 22,
    head: [EXPORT_COLUMNS.map((c) => c.label)],
    body: rsvps.map((rsvp) => EXPORT_COLUMNS.map((c) => String(c.get(rsvp)))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [28, 77, 58] },
  });

  doc.save(`rsvps-${Date.now()}.pdf`);
}

const editRsvpSchema = z.object({
  guestName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  attending: z.enum(['yes', 'no']),
  guestCount: z.coerce.number().min(1).max(3),
  deliveryMethod: z.enum(['none', 'pickup', 'delivery']),
  deliveryAddress: z.string().optional(),
  deliveryProvider: z.string().optional(),
  note: z.string().optional(),
});

type EditRsvpValues = z.infer<typeof editRsvpSchema>;

function describeSelections(
  selections: { asoebiItemId: number; asoebiSize: string; quantity: number }[],
  itemsById: Map<number, AsoebiItem>,
) {
  return selections.map((selection) => {
    const item = itemsById.get(selection.asoebiItemId);
    return {
      key: `${selection.asoebiItemId}-${selection.asoebiSize}`,
      label: item ? item.name : `Item #${selection.asoebiItemId}`,
      size: selection.asoebiSize,
      quantity: selection.quantity,
      amount: item ? item.price * selection.quantity : null,
      currency: item?.currency ?? 'NGN',
    };
  });
}

function OrderDetails({ rsvp, itemsById }: { rsvp: AdminRsvp; itemsById: Map<number, AsoebiItem> }) {
  if (rsvp.asoebiInterest !== 'yes') return null;

  const ownSelections = describeSelections(rsvp.asoebiSelections, itemsById);
  const guestsWithSelections = rsvp.additionalGuests.filter((g) => g.asoebiSelections.length > 0);

  if (ownSelections.length === 0 && guestsWithSelections.length === 0) return null;

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
      <p className="text-sm font-semibold text-foreground">Order Details</p>

      {ownSelections.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{rsvp.guestName}</p>
          <ul className="text-sm space-y-1">
            {ownSelections.map((s) => (
              <li key={s.key} className="flex justify-between">
                <span>{s.label} ({s.size}) × {s.quantity}</span>
                {s.amount !== null && <span className="text-muted-foreground">{s.currency} {s.amount.toLocaleString()}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guestsWithSelections.map((guest) => {
        const selections = describeSelections(guest.asoebiSelections, itemsById);
        return (
          <div key={guest.name}>
            <p className="text-xs font-medium text-muted-foreground mb-1">{guest.name}</p>
            <ul className="text-sm space-y-1">
              {selections.map((s) => (
                <li key={s.key} className="flex justify-between">
                  <span>{s.label} ({s.size}) × {s.quantity}</span>
                  {s.amount !== null && <span className="text-muted-foreground">{s.currency} {s.amount.toLocaleString()}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EditRsvpDialog({
  rsvp,
  itemsById,
  onClose,
}: {
  rsvp: AdminRsvp;
  itemsById: Map<number, AsoebiItem>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateRsvp = useUpdateAdminRsvp();

  const form = useForm<EditRsvpValues>({
    resolver: zodResolver(editRsvpSchema),
    defaultValues: {
      guestName: rsvp.guestName,
      email: rsvp.email,
      phone: rsvp.phone ?? '',
      attending: rsvp.attending ? 'yes' : 'no',
      guestCount: rsvp.guestCount,
      deliveryMethod: rsvp.deliveryMethod ?? 'none',
      deliveryAddress: rsvp.deliveryAddress ?? '',
      deliveryProvider: rsvp.deliveryProvider ?? '',
      note: rsvp.note ?? '',
    },
  });

  const watchDeliveryMethod = form.watch('deliveryMethod');

  const onSubmit = (values: EditRsvpValues) => {
    updateRsvp.mutate({
      id: rsvp.id,
      data: {
        guestName: values.guestName,
        email: values.email,
        phone: values.phone || '',
        attending: values.attending === 'yes',
        guestCount: values.guestCount,
        additionalGuests: rsvp.additionalGuests.map((guest) => ({
          name: guest.name,
          asoebiSelections: guest.asoebiSelections.map((selection) => ({
            itemId: selection.asoebiItemId,
            size: selection.asoebiSize,
            quantity: selection.quantity,
          })),
        })),
        asoebiInterest: rsvp.asoebiInterest as 'yes' | 'no',
        asoebiSelections: rsvp.asoebiSelections.map((selection) => ({
          itemId: selection.asoebiItemId,
          size: selection.asoebiSize,
          quantity: selection.quantity,
        })),
        deliveryMethod: values.deliveryMethod === 'none' ? null : values.deliveryMethod,
        deliveryAddress: values.deliveryMethod === 'delivery' ? values.deliveryAddress || '' : null,
        deliveryProvider: values.deliveryMethod === 'delivery' ? values.deliveryProvider || '' : null,
        note: values.note || '',
      },
    }, {
      onSuccess: (updated) => {
        toast({ title: 'RSVP updated' });
        queryClient.setQueryData(getListAdminRsvpsQueryKey(), (old: AdminRsvp[] | undefined) =>
          old?.map((r) => (r.id === updated.id ? updated : r)),
        );
        onClose();
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit RSVP</DialogTitle>
        </DialogHeader>
        <OrderDetails rsvp={rsvp} itemsById={itemsById} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="attending"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attending</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1 pt-1"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="yes" />
                          </FormControl>
                          <FormLabel className="font-normal">Yes</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="no" />
                          </FormControl>
                          <FormLabel className="font-normal">No</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guestCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Count</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {rsvp.asoebiInterest === 'yes' && (
              <div className="space-y-4 pt-2 border-t border-border">
                <FormField
                  control={form.control}
                  name="deliveryMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1 pt-1"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="pickup" />
                            </FormControl>
                            <FormLabel className="font-normal">Pickup</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="delivery" />
                            </FormControl>
                            <FormLabel className="font-normal">Delivery</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchDeliveryMethod === 'delivery' && (
                  <>
                    <FormField
                      control={form.control}
                      name="deliveryProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Provider</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Bolt" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRsvp.isPending}>
                {updateRsvp.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardRsvps() {
  const { data: rsvps, isLoading } = useListAdminRsvps();
  const { data: asoebiItems } = useListAsoebi();
  const [editing, setEditing] = useState<AdminRsvp | null>(null);

  const itemsById = new Map((asoebiItems ?? []).map((item) => [item.id, item]));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">RSVPs</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const rows = rsvps ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">RSVPs</h1>
          <p className="text-muted-foreground mt-1">View and correct guest responses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={rows.length === 0} onClick={() => exportRsvpsCsv(rows)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel (CSV)
          </Button>
          <Button variant="outline" disabled={rows.length === 0} onClick={() => exportRsvpsPdf(rows)}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Asoebi</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rsvps ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No RSVPs yet.
                </TableCell>
              </TableRow>
            ) : (
              rsvps!.map((rsvp) => (
                <TableRow key={rsvp.id}>
                  <TableCell className="font-medium">{rsvp.guestName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{rsvp.email}</div>
                    {rsvp.phone && <div>{rsvp.phone}</div>}
                  </TableCell>
                  <TableCell>
                    {rsvp.attending ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Attending</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none">Declined</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {rsvp.asoebiInterest === 'yes' ? (
                      <Badge variant="outline" className="text-secondary-foreground border-secondary bg-secondary/10">Yes</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rsvp.deliveryMethod
                      ? rsvp.deliveryMethod === 'delivery'
                        ? `Delivery${rsvp.deliveryProvider ? ` (${rsvp.deliveryProvider})` : ''}`
                        : 'Pickup'
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(rsvp.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(rsvp)} aria-label={`Edit ${rsvp.guestName}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {editing && <EditRsvpDialog rsvp={editing} itemsById={itemsById} onClose={() => setEditing(null)} />}
    </div>
  );
}
