import * as React from "react"
import {
  getGetWeddingQueryKey,
  useGetWedding,
  useListAsoEbiOrders,
  useListGuests,
  useListNotifications,
  useUpdateWedding,
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { CreditCard, Download, FileSpreadsheet, Image, QrCode, Save, Settings2, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

type SettingsForm = {
  couple: string
  date: string
  traditionalDate: string
  whiteWeddingDate: string
  venue: string
  city: string
  eyebrow: string
  venueDescription: string
  dressCode: string
  asoEbiTitle: string
  asoEbiSubtitle: string
  backgroundImage: string
  menuDashboard: string
  menuGuests: string
  menuNotifications: string
  menuAsoEbi: string
  menuSettings: string
  paymentDeadline: string
  paymentBank: string
  paymentAccountName: string
  paymentAccountNumber: string
  paymentTransferRemark: string
  paymentInstructions: string
  paymentMethods: Array<"paystack_card" | "paystack_transfer" | "custom_transfer">
}

const createForm = (wedding: SettingsForm): SettingsForm => ({ ...wedding })

export default function Settings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: wedding, isLoading } = useGetWedding()
  const { data: guests } = useListGuests()
  const { data: orders } = useListAsoEbiOrders()
  const { data: notifications } = useListNotifications()
  const checkInUrl = typeof window === "undefined" ? "" : `${window.location.origin}/check-in`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&format=png&data=${encodeURIComponent(checkInUrl)}`
  const [form, setForm] = React.useState<SettingsForm | null>(null)
  const updateWedding = useUpdateWedding({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetWeddingQueryKey() })
        toast({ title: "Settings saved", description: "Your public wedding page and workspace menu have been updated." })
      },
      onError: () => {
        toast({ title: "Settings could not be saved", description: "Please try again.", variant: "destructive" })
      },
    },
  })

  React.useEffect(() => {
    if (wedding) {
      setForm(createForm({
        couple: wedding.couple,
        date: wedding.date.slice(0, 10),
        traditionalDate: wedding.traditionalDate.slice(0, 10),
        whiteWeddingDate: wedding.whiteWeddingDate.slice(0, 10),
        venue: wedding.venue,
        city: wedding.city,
        eyebrow: wedding.eyebrow,
        venueDescription: wedding.venueDescription,
        dressCode: wedding.dressCode,
        asoEbiTitle: wedding.asoEbiTitle,
        asoEbiSubtitle: wedding.asoEbiSubtitle,
        backgroundImage: wedding.backgroundImage,
        menuDashboard: wedding.menuDashboard,
        menuGuests: wedding.menuGuests,
        menuNotifications: wedding.menuNotifications,
        menuAsoEbi: wedding.menuAsoEbi,
        menuSettings: wedding.menuSettings,
        paymentDeadline: wedding.paymentDeadline.slice(0, 10),
        paymentBank: wedding.paymentBank,
        paymentAccountName: wedding.paymentAccountName,
        paymentAccountNumber: wedding.paymentAccountNumber,
        paymentTransferRemark: wedding.paymentTransferRemark,
        paymentInstructions: wedding.paymentInstructions,
        paymentMethods: wedding.paymentMethods,
      }))
    }
  }, [wedding])

  if (isLoading || !form) {
    return <div className="animate-pulse bg-muted rounded-xl h-[560px] w-full" />
  }

  const updateField = <K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) => {
    setForm((current) => current ? { ...current, [field]: value } : current)
  }

  const togglePaymentMethod = (method: SettingsForm["paymentMethods"][number]) => {
    const next = form.paymentMethods.includes(method)
      ? form.paymentMethods.filter((item) => item !== method)
      : [...form.paymentMethods, method]
    if (next.length > 0) updateField("paymentMethods", next)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    updateWedding.mutate({ data: { ...form, date: form.whiteWeddingDate } })
  }

  return (
    <form onSubmit={submit} className="max-w-5xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-primary">Wedding Settings</h1>
          <p className="mt-1 text-muted-foreground">Personalize your public page and every menu label in the couple’s workspace.</p>
        </div>
        <Button type="submit" className="gap-2" disabled={updateWedding.isPending}>
          <Save className="h-4 w-4" />
          {updateWedding.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><Type className="h-5 w-5" /></div>
              <div>
                <CardTitle>Homepage text</CardTitle>
                <CardDescription>Names, invitation wording, and event details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Couple’s names"><Input value={form.couple} onChange={(event) => updateField("couple", event.target.value)} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Traditional ceremony"><Input type="date" value={form.traditionalDate} onChange={(event) => updateField("traditionalDate", event.target.value)} /></Field>
              <Field label="White wedding"><Input type="date" value={form.whiteWeddingDate} onChange={(event) => updateField("whiteWeddingDate", event.target.value)} /></Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City"><Input value={form.city} onChange={(event) => updateField("city", event.target.value)} /></Field>
              <Field label="Countdown uses"><Input value="White wedding date" readOnly className="text-muted-foreground" /></Field>
            </div>
            <Field label="Venue"><Input value={form.venue} onChange={(event) => updateField("venue", event.target.value)} /></Field>
            <Field label="Invitation line"><Input value={form.eyebrow} onChange={(event) => updateField("eyebrow", event.target.value)} /></Field>
            <Field label="Venue description"><Textarea rows={4} value={form.venueDescription} onChange={(event) => updateField("venueDescription", event.target.value)} /></Field>
            <Field label="Dress code message"><Textarea rows={3} value={form.dressCode} onChange={(event) => updateField("dressCode", event.target.value)} /></Field>
            <Field label="Aso Ebi section title"><Input value={form.asoEbiTitle} onChange={(event) => updateField("asoEbiTitle", event.target.value)} /></Field>
            <Field label="Aso Ebi section subtitle"><Input value={form.asoEbiSubtitle} onChange={(event) => updateField("asoEbiSubtitle", event.target.value)} /></Field>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary/25 p-2 text-primary"><Image className="h-5 w-5" /></div>
                <div>
                  <CardTitle>Hero background</CardTitle>
              <CardDescription>The homepage uses the lavender, plum, champagne, and cream palette from your invitation.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Plum", "hsl(315 55% 24%)"],
                  ["Lavender", "hsl(272 40% 76%)"],
                  ["Champagne", "hsl(38 56% 68%)"],
                  ["Cream", "hsl(38 56% 96%)"],
                ].map(([name, color]) => (
                  <div key={name} className="space-y-2 text-center">
                    <div className="h-14 rounded-lg border shadow-inner" style={{ backgroundColor: color }} />
                    <p className="text-xs font-medium text-muted-foreground">{name}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Background photography is removed from the public page so the typography and event details remain the focus.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><CreditCard className="h-5 w-5" /></div>
                <div>
                  <CardTitle>Payment collection</CardTitle>
                  <CardDescription>Choose the guest payment options and customize the manual transfer instructions.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="Payment deadline"><Input type="date" value={form.paymentDeadline} onChange={(event) => updateField("paymentDeadline", event.target.value)} /></Field>
              <div className="space-y-3">
                <p className="text-sm font-medium">Guest payment options</p>
                {[
                  ["paystack_card", "Paystack card payment", "Guests pay securely with debit or credit cards."],
                  ["paystack_transfer", "Paystack bank transfer", "Guests complete a secure bank transfer through Paystack."],
                  ["custom_transfer", "Manual bank transfer", "Show your own bank account details and collection instructions."],
                ].map(([method, title, description]) => (
                  <label key={method} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.paymentMethods.includes(method as SettingsForm["paymentMethods"][number])}
                      onChange={() => togglePaymentMethod(method as SettingsForm["paymentMethods"][number])}
                    />
                    <span><strong className="block text-foreground">{title}</strong><span className="text-muted-foreground">{description}</span></span>
                  </label>
                ))}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Bank"><Input value={form.paymentBank} onChange={(event) => updateField("paymentBank", event.target.value)} /></Field>
                <Field label="Account name"><Input value={form.paymentAccountName} onChange={(event) => updateField("paymentAccountName", event.target.value)} /></Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Account number"><Input inputMode="numeric" value={form.paymentAccountNumber} onChange={(event) => updateField("paymentAccountNumber", event.target.value)} /></Field>
                <Field label="Transfer remark"><Input value={form.paymentTransferRemark} onChange={(event) => updateField("paymentTransferRemark", event.target.value)} /></Field>
              </div>
              <Field label="Payment instructions"><Textarea rows={3} value={form.paymentInstructions} onChange={(event) => updateField("paymentInstructions", event.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary/25 p-2 text-primary"><QrCode className="h-5 w-5" /></div>
                <div>
                  <CardTitle>Event check-in QR code</CardTitle>
                  <CardDescription>Display this at the white wedding for guests to scan and confirm their arrival.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-3 shadow-sm">
                <img src={qrCodeUrl} alt="QR code for wedding guest check-in" className="h-44 w-44" />
              </div>
              <p className="text-center text-xs text-muted-foreground">Confirmation activates automatically on the white wedding date.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={checkInUrl} target="_blank" rel="noreferrer">Open check-in page</a>
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                  <a href={qrCodeUrl} download="wedplan-event-check-in-qr.png"><Download className="h-3.5 w-3.5" /> Download QR</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/40 p-2 text-primary"><Settings2 className="h-5 w-5" /></div>
                <div>
                  <CardTitle>Workspace menu labels</CardTitle>
                  <CardDescription>Rename every section in your planning dashboard.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Dashboard"><Input value={form.menuDashboard} onChange={(event) => updateField("menuDashboard", event.target.value)} /></Field>
              <Field label="Guests"><Input value={form.menuGuests} onChange={(event) => updateField("menuGuests", event.target.value)} /></Field>
              <Field label="Campaigns"><Input value={form.menuNotifications} onChange={(event) => updateField("menuNotifications", event.target.value)} /></Field>
              <Field label="Aso Ebi"><Input value={form.menuAsoEbi} onChange={(event) => updateField("menuAsoEbi", event.target.value)} /></Field>
              <Field label="Settings"><Input value={form.menuSettings} onChange={(event) => updateField("menuSettings", event.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><FileSpreadsheet className="h-5 w-5" /></div>
                <div>
                  <CardTitle>Export your planning data</CardTitle>
                  <CardDescription>Download Excel-compatible files for sharing, printing, or offline planning.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button type="button" variant="outline" className="justify-between" onClick={() => downloadExcel(
                "WedPlan guest list",
                ["Name", "Email", "Phone", "Party size", "RSVP", "Registered", "Tags"],
                (guests ?? []).map((guest) => [guest.name, guest.email, guest.phone, guest.partySize, guest.rsvp, guest.registeredAt, guest.tags.join(", ")]),
                "wedplan-guest-list.xls",
              )}>
                <span>Guest list & RSVP</span><span className="text-xs text-muted-foreground">{guests?.length ?? 0} guests</span>
              </Button>
              <Button type="button" variant="outline" className="justify-between" onClick={() => downloadExcel(
                "WedPlan Aso Ebi orders",
                ["Guest", "Phone", "Email", "Item", "Quantity", "Amount", "Booking option", "Cap size", "Delivery address", "Notes", "Status", "Ordered"],
                (orders ?? []).map((order) => [
                  order.guestName,
                  order.phone,
                  order.email ?? "",
                  order.itemName,
                  order.quantity,
                  order.amount,
                  order.orderMode,
                  order.capSize,
                  order.deliveryAddress,
                  order.notes,
                  order.status,
                  order.orderedAt,
                ]),
                "wedplan-aso-ebi-orders.xls",
              )}>
                <span>Aso Ebi orders & payments</span><span className="text-xs text-muted-foreground">{orders?.length ?? 0} orders</span>
              </Button>
              <Button type="button" variant="outline" className="justify-between" onClick={() => downloadExcel(
                "WedPlan notification campaigns",
                ["Campaign", "Channel", "Audience", "Status", "Sent", "Opens"],
                (notifications ?? []).map((notification) => [notification.title, notification.channel, notification.audience, notification.status, notification.sentAt, notification.opens]),
                "wedplan-notification-campaigns.xls",
              )}>
                <span>Notification campaigns</span><span className="text-xs text-muted-foreground">{notifications?.length ?? 0} campaigns</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

function downloadExcel(
  title: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  filename: string,
) {
  const escapeCell = (value: string | number | null | undefined) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  const table = `
    <html><head><meta charset="UTF-8"></head><body>
      <h2>${escapeCell(title)}</h2>
      <table border="1">
        <thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </body></html>`
  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
  )
}