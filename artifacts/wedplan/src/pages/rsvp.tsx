import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useListAsoebi, useCreateRsvp, useGetEvent } from '@workspace/api-client-react';

import { Check, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const rsvpSchema = z.object({
  guestName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  attending: z.boolean({ required_error: "Please let us know if you can make it" }),
  guestCount: z.coerce.number().min(1).max(10).optional(),
  asoebiInterest: z.enum(['yes', 'no'], { required_error: "Will you be buying asoebi?" }),
  asoebiItemId: z.coerce.number().optional().nullable(),
  asoebiSize: z.string().optional().nullable(),
  note: z.string().optional(),
}).refine(data => {
  if (data.asoebiInterest === 'yes') {
    return !!data.asoebiItemId && !!data.asoebiSize;
  }
  return true;
}, {
  message: "Please select an Asoebi item and size",
  path: ['asoebiItemId']
});

type RsvpFormValues = z.infer<typeof rsvpSchema>;

export default function RsvpPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isComplete, setIsComplete] = useState(false);
  
  const { data: event } = useGetEvent();
  const { data: asoebiItems, isLoading: loadingAsoebi } = useListAsoebi();
  const createRsvp = useCreateRsvp();

  const form = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      guestName: "",
      email: "",
      phone: "",
      guestCount: 1,
      note: "",
    }
  });

  const watchAttending = form.watch("attending");
  const watchAsoebiInterest = form.watch("asoebiInterest");
  const watchAsoebiItemId = form.watch("asoebiItemId");

  const selectedAsoebiItem = asoebiItems?.find(item => item.id === watchAsoebiItemId);

  const onSubmit = (values: RsvpFormValues) => {
    createRsvp.mutate({ data: {
      ...values,
      asoebiInterest: values.asoebiInterest as 'yes' | 'no'
    }}, {
      onSuccess: (result) => {
        sessionStorage.setItem('wedplan_rsvp', JSON.stringify(result));
        if (result.nextStep === 'cart') {
          setLocation('/cart');
        } else {
          setIsComplete(true);
        }
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: err.data?.error || "An error occurred while saving your RSVP."
        });
      }
    });
  };

  if (isComplete) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            {watchAttending ? <Check className="w-10 h-10" /> : <Heart className="w-10 h-10" />}
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            {watchAttending ? "We can't wait to see you!" : "You will be missed!"}
          </h1>
          <p className="text-muted-foreground">
            {watchAttending 
              ? "Your RSVP has been confirmed and your details have been saved."
              : "Thank you for letting us know. We hope to celebrate with you another time."}
          </p>
          <Button onClick={() => setLocation('/')} variant="outline" className="mt-8">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold text-foreground">RSVP</h1>
          {event && <p className="text-muted-foreground">{event.coupleNames} • {new Date(event.date).toLocaleDateString()}</p>}
        </div>

        <Card className="border-none shadow-xl bg-card">
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Personal Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-serif font-semibold text-primary border-b border-border pb-2">Guest Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="guestName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jane@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+234..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Attendance */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-lg font-serif font-semibold text-primary border-b border-border pb-2">Attendance</h3>
                  
                  <FormField
                    control={form.control}
                    name="attending"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Will you be attending?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(val) => field.onChange(val === 'yes')}
                            defaultValue={field.value === true ? 'yes' : field.value === false ? 'no' : undefined}
                            className="flex flex-col space-y-2"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-lg border border-border bg-background hover-elevate cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="yes" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex-1">Joyfully Accepts</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-lg border border-border bg-background hover-elevate cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="no" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex-1">Regretfully Declines</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchAttending !== undefined && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-6">
                       {watchAttending === true && <FormField
                        control={form.control}
                        name="guestCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Guests (including yourself)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="10" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                       />}

                      <FormField
                        control={form.control}
                        name="asoebiInterest"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Would you like to purchase Asoebi?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-2"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-lg border border-border bg-background hover-elevate cursor-pointer">
                                  <FormControl>
                                    <RadioGroupItem value="yes" />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer flex-1">Yes, show me the options</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-lg border border-border bg-background hover-elevate cursor-pointer">
                                  <FormControl>
                                    <RadioGroupItem value="no" />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer flex-1">No, I'll wear my own outfit</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchAsoebiInterest === 'yes' && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-6 pt-4 bg-muted/30 p-6 rounded-xl border border-border">
                      <h4 className="font-serif font-semibold text-foreground">Select Asoebi</h4>
                      
                      {loadingAsoebi ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Skeleton className="h-40 rounded-lg" />
                          <Skeleton className="h-40 rounded-lg" />
                        </div>
                      ) : (
                        <FormField
                          control={form.control}
                          name="asoebiItemId"
                          render={({ field }) => (
                            <FormItem>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {asoebiItems?.map((item) => (
                                  <div
                                    key={item.id}
                                    onClick={() => item.available && field.onChange(item.id)}
                                    className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                                      field.value === item.id 
                                        ? 'border-primary shadow-md' 
                                        : 'border-transparent bg-background shadow-sm hover:border-primary/40'
                                    } ${!item.available ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                  >
                                    <div className="aspect-[4/3] bg-muted relative">
                                      {item.imageUrl ? (
                                        <img
                                          src={`${import.meta.env.BASE_URL}${item.imageUrl.replace(/^\//, '')}`}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                          <span className="text-primary/40 font-serif">Fabric</span>
                                        </div>
                                      )}
                                      {!item.available && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                                          <span className="bg-foreground text-background px-3 py-1 text-sm font-semibold rounded">Sold Out</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-3">
                                      <p className="font-semibold text-sm">{item.name}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                                      <p className="text-sm font-semibold text-primary mt-2">
                                        {item.currency} {item.price.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedAsoebiItem && (
                        <FormField
                          control={form.control}
                          name="asoebiSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Size / Yards</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {selectedAsoebiItem.sizes.map((size) => (
                                    <SelectItem key={size} value={size}>{size}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-6 pt-2">
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message for the Couple (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any dietary requirements or well wishes?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg rounded-xl mt-8"
                  disabled={createRsvp.isPending}
                >
                  {createRsvp.isPending ? "Submitting..." : watchAsoebiInterest === 'yes' ? "Continue to Payment" : "Submit RSVP"}
                </Button>

              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}