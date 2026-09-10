import { useQueryClient } from '@tanstack/react-query';
import {
  useListAdminOrders,
  useUpdateOrderFulfillment,
  getListAdminOrdersQueryKey,
  type AdminOrder,
} from '@/api';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, FileText, PackageCheck, RotateCcw } from 'lucide-react';

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
  return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none capitalize">{status}</Badge>;
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
  const { data: orders, isLoading } = useListAdminOrders();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">Orders</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const rows = orders ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Every asoebi and gift transaction, for your records.</p>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No orders yet.
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
                  <TableCell>{order.itemCount || '—'}</TableCell>
                  <TableCell>
                    {order.currency} {order.totalAmount.toLocaleString()}
                    {order.giftAmount > 0 && order.type === 'asoebi' && (
                      <div className="text-xs text-muted-foreground">
                        incl. {order.currency} {order.giftAmount.toLocaleString()} gift
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{order.paymentMethod.replace('_', ' ')}</TableCell>
                  <TableCell>{statusBadge(order.status)}</TableCell>
                  <TableCell>
                    <DeliveryCell order={order} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
