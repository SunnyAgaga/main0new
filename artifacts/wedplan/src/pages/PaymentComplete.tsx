import * as React from "react"
import { useVerifyPaystackPayment } from "@workspace/api-client-react"
import { CheckCircle2, CircleX, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function PaymentComplete() {
  const [reference] = React.useState(() => new URLSearchParams(window.location.search).get("reference"))
  const { data, isLoading, isError } = useVerifyPaystackPayment(reference ?? "", {
    query: { queryKey: ["verifyPaystackPayment", reference], enabled: Boolean(reference) },
  })

  const content = !reference
    ? {
        icon: <CircleX className="h-12 w-12 text-destructive" />,
        title: "Payment reference missing",
        body: "We could not find the Paystack payment reference. Please return to your Aso Ebi order and try again.",
      }
    : isLoading
      ? {
          icon: <LoaderCircle className="h-12 w-12 animate-spin text-primary" />,
          title: "Confirming your payment",
          body: "Please wait while we verify your Paystack transaction.",
        }
      : isError || !data?.paid
        ? {
            icon: <CircleX className="h-12 w-12 text-destructive" />,
            title: "Payment is not yet confirmed",
            body: "Paystack has not confirmed this transaction. If you completed payment, please wait a moment and try again.",
          }
        : {
            icon: <CheckCircle2 className="h-12 w-12 text-emerald-600" />,
            title: "Payment confirmed",
            body: "Your Aso Ebi order has been marked as paid. Thank you for celebrating with us.",
          }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <Card className="w-full max-w-lg border-none shadow-xl">
        <CardContent className="flex flex-col items-center p-8 text-center sm:p-12">
          {content.icon}
          <h1 className="mt-5 font-serif text-3xl text-primary">{content.title}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{content.body}</p>
          <Button className="mt-8" asChild>
            <a href="/#aso-ebi">Return to Aso Ebi</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}