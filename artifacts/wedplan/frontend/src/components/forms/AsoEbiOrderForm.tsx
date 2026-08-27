import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  useCreateAsoEbiOrder,
  getListAsoEbiOrdersQueryKey,
  getGetDashboardQueryKey,
  useGetWedding,
  useInitializePaystackPayment,
} from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  guestName: z.string().trim().min(2, "Please enter your full name"),
  phone: z.string().trim().min(7, "Please enter a valid phone or WhatsApp number"),
  email: z.union([z.string().email("Enter a valid email address"), z.literal("")]),
  quantity: z.coerce.number().int().min(1).max(50),
  orderMode: z.enum(["ready_to_pay", "reservation"]),
  paymentMethod: z.enum(["paystack_card", "paystack_transfer", "custom_transfer"]),
  capSize: z.string(),
  deliveryAddress: z.string().trim().min(5, "Please provide a delivery address"),
  notes: z.string().trim(),
})

type OrderFormValues = z.infer<typeof formSchema>

export function AsoEbiOrderForm({ item, onSuccess }: { item: any; onSuccess?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const createOrder = useCreateAsoEbiOrder()
  const initializePaystackPayment = useInitializePaystackPayment()
  const { data: wedding } = useGetWedding()
  const isCap = item.name.toLowerCase().includes("cap") || item.name.toLowerCase().includes("fila")

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: "",
      phone: "",
      email: "",
      quantity: 1,
      orderMode: "ready_to_pay",
      paymentMethod: "custom_transfer",
      capSize: "",
      deliveryAddress: "",
      notes: "",
    },
  })

  const quantity = form.watch("quantity") || 1
  const orderMode = form.watch("orderMode")
  const paymentMethod = form.watch("paymentMethod")
  const totalAmount = item.price * quantity
  const paymentLabels = {
    paystack_card: "Pay online with card",
    paystack_transfer: "Pay online with bank transfer",
    custom_transfer: "Manual bank transfer",
  } as const
  const enabledPaymentMethods = (wedding?.paymentMethods.length
    ? wedding.paymentMethods
    : ["paystack_card", "paystack_transfer", "custom_transfer"]) as Array<keyof typeof paymentLabels>

  function onSubmit(values: OrderFormValues) {
    if (isCap && !values.capSize.trim()) {
      form.setError("capSize", { message: "Please provide the cap measurement or size" })
      return
    }
    if (values.orderMode === "ready_to_pay" && values.paymentMethod.startsWith("paystack_") && !values.email) {
      form.setError("email", { message: "An email address is required for Paystack checkout" })
      return
    }

    createOrder.mutate(
      {
        data: {
          guestName: values.guestName,
          phone: values.phone,
          email: values.email || null,
          itemName: item.name,
          quantity: values.quantity,
          amount: totalAmount,
          orderMode: values.orderMode,
          paymentMethod: values.paymentMethod,
          capSize: values.capSize,
          deliveryAddress: values.deliveryAddress,
          notes: values.notes,
        },
      },
      {
        onSuccess: (order) => {
          if (values.orderMode === "ready_to_pay" && values.paymentMethod.startsWith("paystack_")) {
            initializePaystackPayment.mutate(
              { data: { orderId: order.id, email: values.email } },
              {
                onSuccess: ({ authorizationUrl }) => {
                  window.location.assign(authorizationUrl)
                },
                onError: () => {
                  toast({
                    title: "Order saved, but checkout could not start",
                    description: "Please try the online payment option again or use the manual transfer details.",
                    variant: "destructive",
                  })
                },
              },
            )
            return
          }
          toast({
            title: values.orderMode === "ready_to_pay" ? "Order recorded" : "Reservation recorded",
            description:
              values.orderMode === "ready_to_pay"
                ? "Use the collection details below to complete your payment."
                : `Your item is reserved. Please complete payment by ${wedding?.paymentDeadline ?? "the payment deadline"}.`,
          })
          form.reset()
          queryClient.invalidateQueries({ queryKey: getListAsoEbiOrdersQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
          onSuccess?.()
        },
        onError: () => {
          toast({
            title: "Order could not be saved",
            description: "Please check the form and try again.",
            variant: "destructive",
          })
        },
      },
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Your selection</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <p className="font-serif text-lg text-primary">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.color}</p>
            </div>
            <p className="whitespace-nowrap text-right font-serif text-lg font-bold text-primary">
              <span className="block text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground">Unit price</span>
              ₦{item.price.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone / WhatsApp</FormLabel>
                <FormControl><Input inputMode="tel" placeholder="+234..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {orderMode === "ready_to_pay" && (
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How would you like to pay?</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {enabledPaymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>{paymentLabels[method]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl><Input type="number" min={1} max={50} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orderMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Booking option</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ready_to_pay">Ready to Pay</SelectItem>
                    <SelectItem value="reservation">Reserve for Me</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isCap && (
          <FormField
            control={form.control}
            name="capSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cap measurement / size</FormLabel>
                <FormControl><Input placeholder="e.g. 23 inches or Large" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="deliveryAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery address</FormLabel>
              <FormControl><Textarea placeholder="Street address, city and state" className="min-h-20" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional notes <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl><Textarea placeholder="Any sizing, delivery, or collection notes" className="min-h-20" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-2xl border border-primary/10 bg-[#fffdfa] p-4 text-sm">
          <p className="font-semibold text-primary">
            {paymentMethod.startsWith("paystack_") && orderMode === "ready_to_pay" ? "Secure Paystack checkout" : "Manual transfer details"}
          </p>
          {paymentMethod.startsWith("paystack_") && orderMode === "ready_to_pay" ? (
            <p className="mt-2 text-muted-foreground">
              Continue to Paystack to complete your {paymentMethod === "paystack_card" ? "card" : "bank transfer"} payment securely.
            </p>
          ) : (
            <>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
            <dt>Bank</dt><dd className="font-medium text-foreground">{wedding?.paymentBank}</dd>
            <dt>Account name</dt><dd className="font-medium text-foreground">{wedding?.paymentAccountName}</dd>
            <dt>Account number</dt><dd className="font-medium text-foreground">{wedding?.paymentAccountNumber}</dd>
            <dt>Remark</dt><dd className="font-medium text-foreground">{wedding?.paymentTransferRemark}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {orderMode === "ready_to_pay"
              ? wedding?.paymentInstructions
              : `Your reservation is held until ${wedding?.paymentDeadline ?? "the payment deadline"}.`}
          </p>
            </>
          )}
        </div>

        <div className="rounded-xl bg-muted p-4">
          <div className="flex justify-between text-sm font-medium">
            <span>Total amount</span>
            <span className="font-serif text-lg font-bold text-primary">₦{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={createOrder.isPending || initializePaystackPayment.isPending}>
          {createOrder.isPending || initializePaystackPayment.isPending
            ? "Saving your booking..."
            : orderMode === "ready_to_pay"
              ? paymentMethod.startsWith("paystack_") ? "Continue to secure payment" : "Save Order & View Payment Details"
              : "Reserve My Aso Ebi"}
        </Button>
      </form>
    </Form>
  )
}