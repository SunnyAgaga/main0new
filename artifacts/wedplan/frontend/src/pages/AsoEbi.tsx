import { useListAsoEbiOrders } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function AsoEbi() {
  const { data: orders, isLoading } = useListAsoEbiOrders()

  if (isLoading) {
    return <div className="animate-pulse bg-muted rounded-xl h-[400px] w-full"></div>
  }

  const totalCollected = orders?.reduce((acc, curr) => 
    curr.status === 'paid' || curr.status === 'collected' ? acc + curr.amount : acc, 0
  ) || 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-primary">Aso Ebi Management</h1>
          <p className="text-muted-foreground mt-1">Track fabric orders and collections.</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-6 py-4 text-right">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-serif font-bold text-primary mt-1">{formatCurrency(totalCollected)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest / Contact</TableHead>
                  <TableHead>Fabric / Item</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No orders have been placed yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="min-w-48">
                        <p className="font-medium">{order.guestName}</p>
                        <p className="text-xs text-muted-foreground">{order.phone}</p>
                        {order.email && <p className="text-xs text-muted-foreground">{order.email}</p>}
                      </TableCell>
                      <TableCell className="min-w-52">
                        <p>{order.itemName}</p>
                        {order.capSize && <p className="text-xs text-muted-foreground">Cap size: {order.capSize}</p>}
                        {order.notes && <p className="text-xs text-muted-foreground">Note: {order.notes}</p>}
                      </TableCell>
                      <TableCell className="min-w-32">
                        <Badge variant="outline">
                          {order.orderMode === "ready_to_pay" ? "Ready to Pay" : "Reservation"}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {order.paymentMethod === "paystack_card"
                            ? "Paystack card"
                            : order.paymentMethod === "paystack_transfer"
                              ? "Paystack transfer"
                              : "Manual transfer"}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-48 text-sm text-muted-foreground">{order.deliveryAddress}</TableCell>
                      <TableCell className="text-center">{order.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'paid' ? 'success' : 
                          order.status === 'collected' ? 'default' : 
                          'warning'
                        } className="capitalize">
                          {order.status}
                        </Badge>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">{order.paymentStatus}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(order.orderedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
