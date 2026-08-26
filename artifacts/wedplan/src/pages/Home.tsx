import * as React from "react"
import { useGetWedding, useListAsoEbi } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { GuestRegistrationForm } from "@/components/forms/GuestRegistrationForm"
import { AsoEbiOrderForm } from "@/components/forms/AsoEbiOrderForm"
import { formatCurrency, formatDate } from "@/lib/utils"

const getCountdown = (date: string) => {
  const target = new Date(`${date}T00:00:00+01:00`).getTime()
  const remaining = Math.max(0, target - Date.now())
  const totalSeconds = Math.floor(remaining / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

const padTime = (value: number) => String(value).padStart(2, "0")

export default function Home() {
  const { data: wedding, isLoading: loadingWedding } = useGetWedding()
  const { data: asoEbiList, isLoading: loadingAsoEbi } = useListAsoEbi()
  const [registerOpen, setRegisterOpen] = React.useState(false)
  const [activeAsoEbiItem, setActiveAsoEbiItem] = React.useState<any | null>(null)
  const [countdowns, setCountdowns] = React.useState({
    traditional: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    white: { days: 0, hours: 0, minutes: 0, seconds: 0 },
  })

  React.useEffect(() => {
    if (!wedding) return
    const updateCountdown = () => {
      setCountdowns({
        traditional: getCountdown(wedding.traditionalDate),
        white: getCountdown(wedding.whiteWeddingDate),
      })
    }
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [wedding])

  if (loadingWedding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
          <p className="text-muted-foreground font-serif">Loading celebration details...</p>
        </div>
      </div>
    )
  }

  if (!wedding) return null
  const countdownCards: Array<{
    event: string
    date: string
    countdown: ReturnType<typeof getCountdown>
  }> = [
    { event: "Traditional ceremony", date: wedding.traditionalDate, countdown: countdowns.traditional },
    { event: "White wedding", date: wedding.whiteWeddingDate, countdown: countdowns.white },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-white pb-20">
      
      {/* Hero Section */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[hsl(315_55%_24%)] px-1 pb-24 pt-20 text-primary-foreground sm:pb-28">
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 18% 18%, hsl(38 56% 78% / 0.5), transparent 28%)",
              "radial-gradient(circle at 84% 24%, hsl(272 40% 76% / 0.45), transparent 32%)",
              "radial-gradient(circle at 52% 88%, hsl(38 56% 68% / 0.24), transparent 36%)",
              "linear-gradient(135deg, hsl(315 55% 24%) 0%, hsl(285 40% 37%) 48%, hsl(38 42% 56%) 100%)",
            ].join(", "),
          }}
        ></div>
        <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_bottom,hsl(315_55%_18%_/_0.1),transparent_45%,hsl(315_55%_18%_/_0.42))]"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h4 className="text-[hsl(38_56%_78%)] font-medium tracking-widest uppercase mb-6 drop-shadow-sm">
            {wedding.eyebrow}
          </h4>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif mb-6 leading-[0.9] text-white">
            {wedding.couple}
          </h1>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-base md:text-lg font-serif text-primary-foreground/90 mt-12">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
              Traditional · {formatDate(wedding.traditionalDate)}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
              White Wedding · {formatDate(wedding.whiteWeddingDate)}
            </span>
          </div>
          <p className="mt-3 text-sm text-primary-foreground/70">{wedding.city}</p>

          <div className="mt-10 flex flex-col items-center gap-7 sm:mt-12">
            <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
              {countdownCards.map(({ event, date, countdown }) => (
                <div key={event} className="rounded-3xl border border-[hsl(38_56%_78%_/_0.45)] bg-[hsl(315_55%_20%_/_0.38)] p-3 shadow-xl backdrop-blur-md sm:p-4">
                  <div className="mb-3 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(38_56%_78%)]">{event}</p>
                    <p className="mt-1 text-sm text-white/80">{formatDate(date)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center sm:gap-2">
                    {[
                      ["Days", countdown.days],
                      ["Hours", padTime(countdown.hours)],
                      ["Minutes", padTime(countdown.minutes)],
                      ["Seconds", padTime(countdown.seconds)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/20 bg-black/10 px-1 py-2 sm:px-2 sm:py-3">
                        <div className="text-xl font-serif text-white sm:text-3xl">{value}</div>
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[hsl(38_56%_78%)] sm:text-[10px]">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-14 px-10 text-lg bg-[hsl(38_56%_68%)] hover:bg-[hsl(38_56%_62%)] text-[hsl(315_55%_18%)] rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 mt-4">
                  RSVP & Register
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
                <DialogHeader className="rounded-t-[2rem] bg-[#fffdfa] px-8 pt-8 sm:px-10">
                  <DialogTitle>Join the Celebration</DialogTitle>
                  <DialogDescription>
                    Let us know you're coming to celebrate with {wedding.couple}.
                  </DialogDescription>
                </DialogHeader>
                <GuestRegistrationForm onSuccess={() => setRegisterOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="relative z-20 rounded-t-[3rem] bg-background px-6 py-24 shadow-2xl">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <div>
            <h2 className="text-4xl font-serif text-primary mb-6">The Venue</h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {wedding.venueDescription}
            </p>
          </div>
          <div className="h-px w-24 bg-border mx-auto"></div>
          <div>
            <h2 className="text-4xl font-serif text-primary mb-6">Dress Code</h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {wedding.dressCode}
            </p>
          </div>
        </div>
      </section>

      {/* Aso Ebi Section */}
      <section id="aso-ebi" className="py-24 px-6 bg-muted/30 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-primary mb-4">{wedding.asoEbiTitle}</h2>
            <p className="text-muted-foreground">{wedding.asoEbiSubtitle}</p>
            <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-secondary/30 bg-card px-5 py-4 text-left shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Aso Ebi booking deadline</p>
                <p className="mt-1 font-serif text-xl text-primary">August 31, 2026</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-0">
                Choose <span className="font-medium text-foreground">Ready to Pay</span> for transfer details, or reserve your item and complete payment before the deadline.
              </p>
            </div>
          </div>

          {!loadingAsoEbi && asoEbiList && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {asoEbiList.map((item) => (
                <Card key={item.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-shadow bg-card">
                  <div 
                    className="h-64 w-full bg-cover bg-center"
                    style={{ backgroundColor: item.color }}
                  >
                    <div className="w-full h-full bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                      <div className="text-white">
                        <div className="font-serif text-xl font-bold leading-tight">{item.name}</div>
                        <div className="text-white/90 text-sm">{item.color}</div>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-2xl font-serif font-bold text-primary">{formatCurrency(item.price)}</span>
                      <span className="text-sm font-medium px-3 py-1 bg-secondary/15 text-secondary rounded-full">
                        {item.available} available
                      </span>
                    </div>
                    
                    <Dialog 
                      open={activeAsoEbiItem?.id === item.id} 
                      onOpenChange={(open) => !open && setActiveAsoEbiItem(null)}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          variant={item.available > 0 ? "default" : "secondary"}
                          disabled={item.available === 0}
                          onClick={() => setActiveAsoEbiItem(item)}
                        >
                          {item.available > 0 ? "Order or Reserve" : "Sold Out"}
                        </Button>
                      </DialogTrigger>
                      {activeAsoEbiItem?.id === item.id && (
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Order {item.name}</DialogTitle>
                            <DialogDescription>
                              Reserve your selection or pay now. All reservations must be completed by August 31, 2026.
                            </DialogDescription>
                          </DialogHeader>
                          <AsoEbiOrderForm 
                            item={item} 
                            onSuccess={() => setActiveAsoEbiItem(null)} 
                          />
                        </DialogContent>
                      )}
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
