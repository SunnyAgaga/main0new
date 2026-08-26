import { useListNotifications } from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { NotificationForm } from "@/components/forms/NotificationForm"
import { Mail, MessageSquare, Smartphone, Plus } from "lucide-react"
import { useState } from "react"

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return <div className="animate-pulse bg-muted rounded-xl h-[400px] w-full"></div>
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'sms': return <Smartphone className="h-4 w-4" />
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-primary">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Communicate with your guests across channels.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Notification Campaign</DialogTitle>
              <DialogDescription>
                Send updates or reminders to your guest list.
              </DialogDescription>
            </DialogHeader>
            <NotificationForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notifications?.map((notification) => (
          <Card key={notification.id} className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant={notification.status === 'sent' ? 'success' : 'secondary'} className="capitalize">
                  {notification.status}
                </Badge>
                <div className="text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs uppercase tracking-wider font-medium">
                  {getChannelIcon(notification.channel)}
                  {notification.channel}
                </div>
              </div>
              <CardTitle className="text-xl line-clamp-2">{notification.title}</CardTitle>
              <CardDescription>
                To: <span className="capitalize text-foreground font-medium">{notification.audience} guests</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-4 border-t flex justify-between items-center text-sm text-muted-foreground">
              <div>
                {notification.status === 'sent' 
                  ? `Sent on ${new Date(notification.sentAt).toLocaleDateString()}` 
                  : "Scheduled to send"}
              </div>
              {notification.status === 'sent' && (
                <div className="font-medium text-foreground">
                  {notification.opens} Opens
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {notifications?.length === 0 && (
          <div className="col-span-full p-12 text-center border rounded-xl border-dashed bg-muted/20">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-serif mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Create your first campaign to send updates, reminders, or venue information to your guests.
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>Create Campaign</Button>
          </div>
        )}
      </div>
    </div>
  )
}
