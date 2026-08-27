import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useCreateGuest, getListGuestsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { Heart } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]),
  phone: z.string().min(10, "Phone number is required"),
  friendOf: z.enum(["bride", "groom", "both"], {
    errorMap: () => ({ message: "Please choose who you are celebrating with." }),
  }),
  rsvp: z.enum(["attending", "declined"]),
  advice: z.string(),
  notes: z.string(),
})

export function GuestRegistrationForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const createGuest = useCreateGuest()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      friendOf: undefined,
      rsvp: "attending",
      advice: "",
      notes: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    createGuest.mutate({ data: { ...values, email: values.email || null, partySize: 1 } }, {
      onSuccess: () => {
        toast({
          title: "Registration successful",
          description: "We can't wait to celebrate with you.",
        })
        form.reset()
        queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
        if (onSuccess) onSuccess()
      },
      onError: () => {
        toast({
          title: "Registration failed",
          description: "Please try again later.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7 rounded-[2rem] border border-[#e5ded8] bg-[#fffdfa] px-6 py-8 sm:px-10 sm:py-10">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold uppercase tracking-[0.08em] text-[#164d45]">Full Name *</FormLabel>
              <FormControl>
                <Input className="h-14 rounded-2xl border-[#e5ded8] bg-[#fffdfa] px-5 text-base shadow-none placeholder:text-[#aeb0b8]" placeholder="e.g. Dr. Babatunde Ogunlesi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <FormLabel className="text-sm font-bold uppercase tracking-[0.08em] text-[#164d45]">Email Address <span className="normal-case font-normal tracking-normal text-[#a09a96]">(optional)</span></FormLabel>
                <span className="text-xs text-[#a09a96]">For email confirmation</span>
              </div>
              <FormControl>
                <Input type="email" className="h-14 rounded-2xl border-[#e5ded8] bg-[#fffdfa] px-5 text-base shadow-none placeholder:text-[#aeb0b8]" placeholder="e.g. guest@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold uppercase tracking-[0.08em] text-[#164d45]">Contact No *</FormLabel>
            <FormControl><Input className="h-14 rounded-2xl border-[#e5ded8] bg-[#fffdfa] px-5 text-base shadow-none placeholder:text-[#aeb0b8]" placeholder="e.g. 08012345678" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="rsvp" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold uppercase tracking-[0.08em] text-[#164d45]">Attendance *</FormLabel>
            <FormControl>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => field.onChange("attending")} className={`h-14 rounded-2xl border px-4 font-semibold transition-colors ${field.value === "attending" ? "border-[#0d5148] bg-[#0d5148] text-white" : "border-[#e5ded8] bg-[#fffdfa] text-[#2e2a2c] hover:border-[#0d5148]"}`}>Joyfully Accept</button>
                <button type="button" onClick={() => field.onChange("declined")} className={`h-14 rounded-2xl border px-4 font-semibold transition-colors ${field.value === "declined" ? "border-[#0d5148] bg-[#0d5148] text-white" : "border-[#e5ded8] bg-[#fffdfa] text-[#2e2a2c] hover:border-[#0d5148]"}`}>Regretfully Decline</button>
              </div>
            </FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="friendOf" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold uppercase tracking-[0.08em] text-[#164d45]">I am a friend of *</FormLabel>
            <FormControl>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Who are you celebrating with?">
                {[
                  ["bride", "The Bride"],
                  ["groom", "The Groom"],
                  ["both", "Both of Them"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === value}
                    onClick={() => field.onChange(value)}
                    className={`min-h-14 rounded-2xl border px-4 py-3 font-semibold transition-colors ${field.value === value ? "border-[#0d5148] bg-[#0d5148] text-white" : "border-[#e5ded8] bg-[#fffdfa] text-[#2e2a2c] hover:border-[#0d5148]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="advice" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold uppercase tracking-[0.08em] text-[#164d45]">Words of Advice / Prayers</FormLabel>
            <FormControl><Input className="h-14 rounded-2xl border-[#e5ded8] bg-[#fffdfa] px-5 text-base shadow-none placeholder:text-[#aeb0b8]" placeholder="And comments you choose fits inside" {...field} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold uppercase tracking-[0.08em] text-[#164d45]">Comments / Notes</FormLabel>
            <FormControl><Textarea rows={4} className="rounded-2xl border-[#e5ded8] bg-[#fffdfa] px-5 py-4 text-base shadow-none placeholder:text-[#aeb0b8]" {...field} /></FormControl>
          </FormItem>
        )} />
        <Button type="submit" className="h-14 w-full rounded-full bg-[#bd3b73] text-base font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#bd3b73]/20 hover:bg-[#a92d63]" disabled={createGuest.isPending}>
          <Heart className="mr-2 h-5 w-5 fill-current" />
          {createGuest.isPending ? "Submitting..." : "Submit RSVP"}
        </Button>
      </form>
    </Form>
  )
}
