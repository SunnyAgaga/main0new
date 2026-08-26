import * as React from "react"
import { useCheckInGuest, useGetWedding } from "@workspace/api-client-react"
import { CheckCircle2, Heart, LoaderCircle, Mail, QrCode, ShieldCheck } from "lucide-react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  )

const getLagosDate = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const value = (kind: string) => parts.find((part) => part.type === kind)?.value
  return `${value("year")}-${value("month")}-${value("day")}`
}

export default function CheckIn() {
  const { data: wedding, isLoading } = useGetWedding()
  const [email, setEmail] = React.useState("")
  const [result, setResult] = React.useState<"success" | "error" | null>(null)
  const [message, setMessage] = React.useState("")
  const checkIn = useCheckInGuest({
    mutation: {
      onSuccess: (guest) => {
        setResult("success")
        setMessage(guest.checkedInAt ? `Welcome, ${guest.name}. Your arrival has been confirmed.` : `Welcome, ${guest.name}.`)
      },
      onError: () => {
        setResult("error")
        setMessage("We could not confirm your arrival. Check-in opens on the white wedding date, and your email must match your registration.")
      },
    },
  })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(null)
    checkIn.mutate({ data: { email } })
  }

  if (isLoading || !wedding) {
    return <main className="min-h-screen bg-background grid place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-primary" /></main>
  }
  const isCheckInOpen = getLagosDate() === wedding.whiteWeddingDate

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--secondary)/0.28),_transparent_38%),hsl(var(--background))] px-5 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center">
        <Link href="/" className="mb-8 flex items-center gap-2 font-serif text-xl text-primary">
          <Heart className="h-5 w-5 fill-primary" /> WedPlan
        </Link>
        <Card className="w-full border-primary/10 shadow-xl shadow-primary/5">
          <CardHeader className="items-center text-center">
            <div className="mb-2 rounded-full bg-primary/10 p-4 text-primary"><QrCode className="h-8 w-8" /></div>
            <CardTitle className="font-serif text-3xl text-primary">Wedding Check-in</CardTitle>
            <CardDescription className="max-w-sm text-base">
              Welcome to the celebration of {wedding.couple}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 rounded-xl border border-secondary/50 bg-secondary/15 px-4 py-3 text-center text-sm text-foreground">
              <strong>White Wedding:</strong> {formatDate(wedding.whiteWeddingDate)}<br />
              <span className="text-muted-foreground">Confirmation activates automatically on this date.</span>
            </div>
            {result === "success" ? (
              <div className="rounded-xl bg-green-50 p-6 text-center text-green-900">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10" />
                <h2 className="text-lg font-semibold">Arrival confirmed</h2>
                <p className="mt-1 text-sm">{message}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <label className="grid gap-2 text-sm font-medium">
                  Registration email address
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-10" type="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                </label>
                {!isCheckInOpen && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Check-in will activate on {formatDate(wedding.whiteWeddingDate)}.</p>}
                {result === "error" && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
                <Button className="w-full gap-2" disabled={checkIn.isPending || !isCheckInOpen}>
                  {checkIn.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {checkIn.isPending ? "Confirming..." : isCheckInOpen ? "Confirm my arrival" : "Check-in is not active yet"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-muted-foreground">For guest privacy, confirmation requires the email used during RSVP registration.</p>
      </div>
    </main>
  )
}