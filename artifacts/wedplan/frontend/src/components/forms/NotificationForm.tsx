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
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCreateNotification, getListNotificationsQueryKey } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  title: z.string().min(5, "Campaign title is required"),
  channel: z.enum(["email", "sms", "whatsapp"]),
  audience: z.enum(["all", "attending", "pending", "declined"]),
})

type NotificationChannel = "email" | "sms" | "whatsapp"

const channelLabels: Record<NotificationChannel, string> = {
  email: "Email Newsletter",
  sms: "SMS Text Message",
  whatsapp: "WhatsApp Broadcast",
}

export function NotificationForm({
  enabledChannels,
  onSuccess,
}: {
  enabledChannels: NotificationChannel[]
  onSuccess?: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const createNotification = useCreateNotification()
  const disabledChannelLabels = (["email", "sms", "whatsapp"] as NotificationChannel[])
    .filter((channel) => !enabledChannels.includes(channel))
    .map((channel) => channelLabels[channel].replace(" Newsletter", "").replace(" Text Message", "").replace(" Broadcast", ""))

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      channel: enabledChannels[0] ?? "email",
      audience: "all",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    createNotification.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Campaign Created",
          description: `Notification campaign "${values.title}" has been scheduled.`,
        })
        form.reset()
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
        if (onSuccess) onSuccess()
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Could not create campaign.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Venue Change Announcement" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Channel</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {enabledChannels.map((channel) => (
                    <SelectItem key={channel} value={channel}>{channelLabels[channel]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {disabledChannelLabels.length === 0
                  ? "All channels are enabled in Settings."
                  : `${disabledChannelLabels.join(", ")} ${disabledChannelLabels.length === 1 ? "is" : "are"} disabled in Settings.`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Audience</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Registered Guests</SelectItem>
                  <SelectItem value="attending">Attending Only (RSVP Yes)</SelectItem>
                  <SelectItem value="pending">Pending RSVP Only</SelectItem>
                  <SelectItem value="declined">Declined Guests</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Select who should receive this notification.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4 flex justify-end gap-2">
          <Button 
            type="submit" 
            disabled={createNotification.isPending}
          >
            {createNotification.isPending ? "Scheduling..." : "Schedule Campaign"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
