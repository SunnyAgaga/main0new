import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useForm, useFieldArray, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useListAsoebi, useCreateRsvp, useGetEvent, type AsoebiItem } from '@workspace/api-client-react';

import { Check, Heart, Info, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const asoebiSelectionSchema = z.object({
  itemId: z.number(),
  size: z.string(),
  quantity: z.number().min(1),
});

const additionalGuestSchema = z.object({
  name: z.string().min(2, "Guest name is required"),
  asoebiSelections: z.array(asoebiSelectionSchema).default([]),
});

const rsvpSchema = z.object({
  guestName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  attending: z.boolean({ required_error: "Please let us know if you can make it" }),
  guestCount: z.coerce.number().min(1).max(3).optional(),
  additionalGuests: z.array(additionalGuestSchema).default([]),
  asoebiInterest: z.enum(['yes', 'no'], { required_error: "Will you be buying asoebi?" }),
  asoebiSelections: z.array(asoebiSelectionSchema).default([]),
  note: z.string().optional(),
}).refine(data => {
  if (data.asoebiInterest === 'yes') {
    return data.asoebiSelections.length > 0;
  }
  return true;
}, {
  message: "Please select at least one asoebi item",
  path: ['asoebiSelections']
});

type RsvpFormValues = z.infer<typeof rsvpSchema>;

type SelectionsFieldName = 'asoebiSelections' | `additionalGuests.${number}.asoebiSelections`;

function AsoebiPicker({
  control,
  selectionsFieldName,
  asoebiItems,
  loading,
}: {
  control: Control<RsvpFormValues>;
  selectionsFieldName: SelectionsFieldName;
  asoebiItems: AsoebiItem[] | undefined;
  loading: boolean;
}) {
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: selectionsFieldName,
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  function quantityFor(itemId: number): number {
    const existing = fields.find((f) => f.itemId === itemId);
    return existing?.quantity ?? 0;
  }

  function setQuantity(item: AsoebiItem, quantity: number) {
    const index = fields.findIndex((f) => f.itemId === item.id);
    if (quantity <= 0) {
      if (index !== -1) remove(index);
      return;
    }
    if (index === -1) {
      append({ itemId: item.id, size: item.sizes[0] ?? 'Standard', quantity });
    } else {
      update(index, { ...fields[index], quantity });
    }
  }

  const women = asoebiItems?.filter((item) => item.category === 'women') ?? [];
  const men = asoebiItems?.filter((item) => item.category === 'men') ?? [];

  return (
    <div className="space-y-4">
      {women.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">For Women</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {women.map((item) => (
              <AsoebiCard
                key={item.id}
                item={item}
                quantity={quantityFor(item.id)}
                onChange={(quantity) => setQuantity(item, quantity)}
              />
            ))}
          </div>
        </div>
      )}
      {men.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">For Men</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {men.map((item) => (
              <AsoebiCard
                key={item.id}
                item={item}
                quantity={quantityFor(item.id)}
                onChange={(quantity) => setQuantity(item, quantity)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AsoebiCard({
  item,
  quantity,
  onChange,
}: {
  item: AsoebiItem;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div
      className={`relative rounded-xl border-2 overflow-hidden transition-all ${
        quantity > 0
          ? 'border-primary shadow-md'
          : 'border-transparent bg-background shadow-sm'
      } ${!item.available ? 'opacity-50 grayscale' : ''}`}
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
      <div className="p-3 space-y-2">
        <p className="font-semibold text-sm">{item.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        <p className="text-sm font-semibold text-primary">
          {item.currency} {item.price.toLocaleString()}
        </p>
        {item.available && (
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => onChange(Math.max(0, quantity - 1))}
              disabled={quantity === 0}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover-elevate"
              aria-label={`Decrease ${item.name} quantity`}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-semibold tabular-nums text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => onChange(quantity + 1)}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover-elevate"
              aria-label={`Increase ${item.name} quantity`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
      additionalGuests: [],
      asoebiSelections: [],
      note: "",
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'additionalGuests',
  });

  const watchAttending = form.watch("attending");
  const watchAsoebiInterest = form.watch("asoebiInterest");
  const watchGuestCount = form.watch("guestCount");

  useEffect(() => {
    if (!watchAttending) return;
    const desired = Math.max(0, (watchGuestCount ?? 1) - 1);
    if (fields.length < desired) {
      for (let i = fields.length; i < desired; i++) {
        append({ name: '', asoebiSelections: [] }, { shouldFocus: false });
      }
    } else if (fields.length > desired) {
      for (let i = fields.length - 1; i >= desired; i--) {
        remove(i);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchGuestCount, watchAttending]);

  const onSubmit = (values: RsvpFormValues) => {
    createRsvp.mutate({ data: {
      ...values,
      asoebiInterest: values.asoebiInterest as 'yes' | 'no',
      additionalGuests: values.attending ? values.additionalGuests : [],
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
          {event && <p className="text-muted-foreground">{event.coupleNames} • {new Date(event.weddingDate).toLocaleDateString()}</p>}
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
                       {watchAttending === true && (
                        <>
                          <FormField
                            control={form.control}
                            name="guestCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Guests (including yourself, max 3)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" max="3" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Alert className="bg-primary/5 border-primary/20">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-foreground/80">
                              Please note: this is an adults-only celebration. No children allowed, kindly plan accordingly.
                            </AlertDescription>
                          </Alert>
                        </>
                       )}

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
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-4 pt-4 bg-muted/30 p-6 rounded-xl border border-border">
                      <h4 className="font-serif font-semibold text-foreground">
                        Select Asoebi for {form.watch('guestName') || 'yourself'}
                      </h4>
                      <p className="text-xs text-muted-foreground -mt-2">
                        Pick as many items as you like, in any combination, and use +/- to set quantity.
                      </p>
                      <AsoebiPicker
                        control={form.control}
                        selectionsFieldName="asoebiSelections"
                        asoebiItems={asoebiItems}
                        loading={loadingAsoebi}
                      />
                      <FormField
                        control={form.control}
                        name="asoebiSelections"
                        render={() => (
                          <FormItem>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchAttending === true && fields.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-lg font-serif font-semibold text-primary border-b border-border pb-2">
                        Additional Guests
                      </h3>
                      {fields.map((guestField, index) => (
                        <div key={guestField.id} className="space-y-4 p-4 rounded-xl border border-border bg-background">
                          <FormField
                            control={form.control}
                            name={`additionalGuests.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Guest {index + 2} Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Guest name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {watchAsoebiInterest === 'yes' && (
                            <div className="pt-2 space-y-4">
                              <p className="text-sm font-medium text-muted-foreground">
                                Asoebi for {form.watch(`additionalGuests.${index}.name`) || `Guest ${index + 2}`} (optional)
                              </p>
                              <AsoebiPicker
                                control={form.control}
                                selectionsFieldName={`additionalGuests.${index}.asoebiSelections`}
                                asoebiItems={asoebiItems}
                                loading={loadingAsoebi}
                              />
                            </div>
                          )}
                        </div>
                      ))}
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
