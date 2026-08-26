import { useGetDashboard, useGetWedding } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, CreditCard, Clock, Activity as ActivityIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function Dashboard() {
  const { data: dashboard, isLoading: dashLoading } = useGetDashboard()
  const { data: wedding, isLoading: wedLoading } = useGetWedding()

  if (dashLoading || wedLoading) {
    return <div className="animate-pulse bg-muted rounded-xl h-[400px] w-full"></div>
  }

  if (!dashboard || !wedding) return null

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary">Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with {wedding.couple}'s wedding.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-medium">
          {wedding.daysRemaining} days remaining
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Registered</p>
                <p className="text-4xl font-serif text-foreground">{dashboard.registered}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Attending</p>
                <p className="text-4xl font-serif text-emerald-600">{dashboard.attending}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
              {Math.round(dashboard.rsvpRate)}% RSVP rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending RSVP</p>
                <p className="text-4xl font-serif text-amber-600">{dashboard.pending}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground flex justify-between">
              <span>{dashboard.declined} declined</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Aso Ebi Collected</p>
                <p className="text-2xl font-serif text-foreground mt-2">{formatCurrency(dashboard.totalCollected)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest registrations, RSVPs and payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dashboard.recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="mt-0.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center
                      ${activity.kind === 'registration' ? 'bg-blue-100 text-blue-600' : 
                        activity.kind === 'rsvp' ? 'bg-emerald-100 text-emerald-600' : 
                        'bg-amber-100 text-amber-600'}`}>
                      <ActivityIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
              {dashboard.recentActivity.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent activity to show.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
