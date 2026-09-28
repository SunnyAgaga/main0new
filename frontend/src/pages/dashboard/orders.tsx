import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from 'wouter';
import {
  useListAdminOrders,
  useUpdateOrderFulfillment,
  useVerifyBankTransfer,
  useDeleteAdminOrder,
  getListAdminOrdersQueryKey,
  type AdminOrder,
} from '@/api';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, FileText, PackageCheck, RotateCcw, Check, X, ImageIcon, ListOrdered, Trash2, XCircle } from 'lucide-react';

const COLUMNS: { key: keyof AdminOrder; label: string }[] = [
  { key: 'reference', label: 'Reference' },
  { key: 'guestName', label: 'Guest' },
  { key: 'email', label: 'Email' },
  { key: 'type', label: 'Type' },
  { key: 'itemCount', label: 'Items' },
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'giftAmount', label: 'Gift Portion' },
  { key: 'currency', label: 'Currency' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'status', label: 'Status' },
  { key: 'deliveryMethod', label: 'Delivery Method' },
  { key: 'fulfillmentStatus', label: 'Fulfillment' },
  { key: 'fulfilledAt', label: 'Fulfilled At' },
  { key: 'createdAt', label: 'Date' },
];

function statusBadge(status: string) {
  if (status === 'paid') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Paid</Badge>;
  }
  if (status === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }
  if (status === 'pending_verification') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Needs Verification</Badge>;
  }
  if (status === 'pay_later') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Pay Later</Badge>;
  }
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none capitalize">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function PaymentStatusCell({ order }: { order: AdminOrder }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const verifyTransfer = useVerifyBankTransfer();

  const respond = (approved: boolean) => {
    verifyTransfer.mutate({ id: order.id, data: { approved } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getListAdminOrdersQueryKey(), (old: AdminOrder[] | undefined) =>
          old?.map((o) => (o.id === updated.id ? updated : o)),
        );
        toast({ title: approved ? 'Payment confirmed' : 'Payment claim rejected' });
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not update',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  return (
    <div className="space-y-1.5">
      {statusBadge(order.status)}
      {order.paymentMethod === 'bank_transfer' && order.status === 'pending_verification' && (
        <div className="space-y-1">
          {order.proofOfPaymentUrl && (
            <a
              href={order.proofOfPaymentUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary underline underline-offset-2"
            >
              <ImageIcon className="w-3 h-3" /> View proof
            </a>
          )}
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={verifyTransfer.isPending}
              onClick={() => respond(true)}
            >
              <Check className="w-3 h-3 mr-1" /> Confirm
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={verifyTransfer.isPending}
              onClick={() => respond(false)}
            >
              <X className="w-3 h-3 mr-1" /> Reject
            </Button>
          </div>
        </div>
      )}
      {order.paymentMethod === 'pay_later' && order.status === 'pay_later' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={verifyTransfer.isPending}
          onClick={() => respond(true)}
        >
          <Check className="w-3 h-3 mr-1" /> Mark as Paid
        </Button>
      )}
    </div>
  );
}

function ItemsCell({ order, onView }: { order: AdminOrder; onView: () => void }) {
  if (order.itemCount === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onView}>
      <ListOrdered className="w-3 h-3 mr-1" />
      {order.itemCount} item{order.itemCount > 1 ? 's' : ''}
    </Button>
  );
}

function OrderItemsDialog({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order Breakdown — {order.reference}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>For</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>{line.guestName}</TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>{line.size}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">
                    {order.currency} {line.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="space-y-1 text-sm border-t border-border pt-3">
            <div className="flex justify-between text-muted-foreground">
              <span>Asoebi subtotal</span>
              <span>
                {order.currency} {(order.totalAmount - order.giftAmount).toLocaleString()}
              </span>
            </div>
            {order.giftAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Gift</span>
                <span>{order.currency} {order.giftAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total paid</span>
              <span>{order.currency} {order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryCell({ order }: { order: AdminOrder }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateFulfillment = useUpdateOrderFulfillment();

  if (order.type !== 'asoebi') {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const delivered = order.fulfillmentStatus === 'delivered';

  const toggle = () => {
    updateFulfillment.mutate({ id: order.id, data: { status: delivered ? 'pending' : 'delivered' } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getListAdminOrdersQueryKey(), (old: AdminOrder[] | undefined) =>
          old?.map((o) => (o.id === updated.id ? updated : o)),
        );
        toast({ title: delivered ? 'Marked as not yet delivered' : 'Marked as delivered' });
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not update',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground capitalize">{order.deliveryMethod ?? '—'}</div>
      <Badge
        variant={delivered ? 'default' : 'secondary'}
        className={delivered ? 'bg-green-100 text-green-800 hover:bg-green-100 border-none' : 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-none'}
      >
        {delivered ? 'Delivered' : 'Pending'}
      </Badge>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled={updateFulfillment.isPending}
        onClick={toggle}
      >
        {delivered ? (
          <>
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </>
        ) : (
          <>
            <PackageCheck className="w-3 h-3 mr-1" /> Mark Delivered
          </>
        )}
      </Button>
    </div>
  );
}

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

function exportCsv(orders: AdminOrder[]) {
  const header = COLUMNS.map((c) => c.label).join(',');
  const rows = orders.map((order) =>
    COLUMNS.map((c) => escapeCsvCell(order[c.key] as string | number)).join(','),
  );
  const csv = [header, ...rows].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `orders-${Date.now()}.csv`);
}

async function exportPdf(orders: AdminOrder[]) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Orders & Transactions', 14, 15);

  autoTable(doc, {
    startY: 22,
    head: [COLUMNS.map((c) => c.label)],
    body: orders.map((order) => COLUMNS.map((c) => String(order[c.key]))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [28, 77, 58] },
  });

  doc.save(`orders-${Date.now()}.pdf`);
}

export default function DashboardOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const filter = new URLSearchParams(search).get('filter');
  const { data: orders, isLoading } = useListAdminOrders();
  const [viewing, setViewing] = useState<AdminOrder | null>(null);
  const deleteOrder = useDeleteAdminOrder();

  const onDelete = (order: AdminOrder) => {
    if (!window.confirm(`Remove order ${order.reference}? This cannot be undone.`)) return;

    deleteOrder.mutate({ id: order.id }, {
      onSuccess: () => {
        queryClient.setQueryData(getListAdminOrdersQueryKey(), (old: AdminOrder[] | undefined) =>
          old?.filter((o) => o.id !== order.id),
        );
        toast({ title: 'Order removed' });
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not remove order',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">Orders</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const allRows = orders ?? [];
  const rows = filter === 'paid' ? allRows.filter((o) => o.status === 'paid') : allRows;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Every asoebi and gift transaction, for your records.</p>
          {filter === 'paid' && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Badge variant="outline" className="text-secondary-foreground border-secondary bg-secondary/10">
                Filtered by Paid Orders
              </Badge>
              <Link href="/dashboard/orders" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Clear
              </Link>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={rows.length === 0} onClick={() => exportCsv(rows)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel (CSV)
          </Button>
          <Button variant="outline" disabled={rows.length === 0} onClick={() => exportPdf(rows)}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {filter ? 'No orders match this filter.' : 'No orders yet.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.reference}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.guestName}</div>
                    <div className="text-xs text-muted-foreground">{order.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">{order.type}</TableCell>
                  <TableCell>
                    <ItemsCell order={order} onView={() => setViewing(order)} />
                  </TableCell>
                  <TableCell>
                    {order.currency} {order.totalAmount.toLocaleString()}
                    {order.giftAmount > 0 && order.type === 'asoebi' && (
                      <div className="text-xs text-muted-foreground">
                        incl. {order.currency} {order.giftAmount.toLocaleString()} gift
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{order.paymentMethod.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <PaymentStatusCell order={order} />
                  </TableCell>
                  <TableCell>
                    <DeliveryCell order={order} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(order)}
                      disabled={deleteOrder.isPending}
                      aria-label={`Remove order ${order.reference}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {viewing && <OrderItemsDialog order={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
