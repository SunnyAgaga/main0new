import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useGetRsvpFormCopy, useUpdateRsvpFormCopy, getGetRsvpFormCopyQueryKey } from '@/api';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const copySchema = z.object({
  pageTitle: z.string().min(1, 'Required'),
  guestInfoHeading: z.string().min(1, 'Required'),
  fullNameLabel: z.string().min(1, 'Required'),
  emailLabel: z.string().min(1, 'Required'),
  phoneLabel: z.string().min(1, 'Required'),
  attendanceHeading: z.string().min(1, 'Required'),
  attendingQuestion: z.string().min(1, 'Required'),
  attendingYesLabel: z.string().min(1, 'Required'),
  attendingNoLabel: z.string().min(1, 'Required'),
  guestCountLabel: z.string().min(1, 'Required'),
  adultsOnlyNotice: z.string(),
  asoebiQuestion: z.string().min(1, 'Required'),
  asoebiYesLabel: z.string().min(1, 'Required'),
  asoebiNoLabel: z.string().min(1, 'Required'),
  asoebiPickerHint: z.string(),
  additionalGuestsHeading: z.string().min(1, 'Required'),
  deliveryHeading: z.string().min(1, 'Required'),
  deliveryQuestion: z.string().min(1, 'Required'),
  pickupLabel: z.string().min(1, 'Required'),
  deliveryLabel: z.string().min(1, 'Required'),
  deliveryProviderQuestion: z.string().min(1, 'Required'),
  deliveryAddressLabel: z.string().min(1, 'Required'),
  giftHeading: z.string().min(1, 'Required'),
  giftQuestion: z.string().min(1, 'Required'),
  giftYesLabel: z.string().min(1, 'Required'),
  giftNoLabel: z.string().min(1, 'Required'),
  giftAmountLabel: z.string().min(1, 'Required'),
  noteLabel: z.string().min(1, 'Required'),
  submitLabel: z.string().min(1, 'Required'),
  submitWithPaymentLabel: z.string().min(1, 'Required'),
  completeAttendingTitle: z.string().min(1, 'Required'),
  completeAttendingMessage: z.string().min(1, 'Required'),
  completeDecliningTitle: z.string().min(1, 'Required'),
  completeDecliningMessage: z.string().min(1, 'Required'),
});

type CopyValues = z.infer<typeof copySchema>;

const FIELD_GROUPS: {
  title: string;
  description: string;
  fields: { name: keyof CopyValues; label: string; multiline?: boolean }[];
}[] = [
  {
    title: 'Page',
    description: 'The RSVP page heading.',
    fields: [{ name: 'pageTitle', label: 'Page Title' }],
  },
  {
    title: 'Guest Information',
    description: 'Fields guests fill in about themselves.',
    fields: [
      { name: 'guestInfoHeading', label: 'Section Heading' },
      { name: 'fullNameLabel', label: 'Full Name Field Label' },
      { name: 'emailLabel', label: 'Email Field Label' },
      { name: 'phoneLabel', label: 'Phone Field Label' },
    ],
  },
  {
    title: 'Attendance',
    description: 'The attendance question and adults-only notice.',
    fields: [
      { name: 'attendanceHeading', label: 'Section Heading' },
      { name: 'attendingQuestion', label: 'Attending Question' },
      { name: 'attendingYesLabel', label: '"Attending" Option Label' },
      { name: 'attendingNoLabel', label: '"Declining" Option Label' },
      { name: 'guestCountLabel', label: 'Guest Count Field Label' },
      { name: 'adultsOnlyNotice', label: 'Adults-Only Notice (leave blank to hide)', multiline: true },
    ],
  },
  {
    title: 'Asoebi',
    description: 'Asks whether the guest wants to buy asoebi.',
    fields: [
      { name: 'asoebiQuestion', label: 'Asoebi Question' },
      { name: 'asoebiYesLabel', label: '"Yes" Option Label' },
      { name: 'asoebiNoLabel', label: '"No" Option Label' },
      { name: 'asoebiPickerHint', label: 'Picker Instructions', multiline: true },
      { name: 'additionalGuestsHeading', label: 'Additional Guests Section Heading' },
    ],
  },
  {
    title: 'Delivery',
    description: 'How the guest receives their asoebi order.',
    fields: [
      { name: 'deliveryHeading', label: 'Section Heading' },
      { name: 'deliveryQuestion', label: 'Delivery Method Question' },
      { name: 'pickupLabel', label: '"Pickup" Option Label' },
      { name: 'deliveryLabel', label: '"Delivery" Option Label' },
      { name: 'deliveryProviderQuestion', label: 'Delivery Provider Question' },
      { name: 'deliveryAddressLabel', label: 'Delivery Address Field Label' },
    ],
  },
  {
    title: 'Gift',
    description: 'The optional gift prompt during RSVP.',
    fields: [
      { name: 'giftHeading', label: 'Section Heading' },
      { name: 'giftQuestion', label: 'Gift Question' },
      { name: 'giftYesLabel', label: '"Yes" Option Label' },
      { name: 'giftNoLabel', label: '"No" Option Label' },
      { name: 'giftAmountLabel', label: 'Gift Amount Field Label' },
    ],
  },
  {
    title: 'Note & Submit',
    description: 'The closing message field and submit button.',
    fields: [
      { name: 'noteLabel', label: 'Note Field Label' },
      { name: 'submitLabel', label: 'Submit Button (no asoebi)' },
      { name: 'submitWithPaymentLabel', label: 'Submit Button (with asoebi)' },
    ],
  },
  {
    title: 'Confirmation Screen',
    description: 'Shown after a guest submits their RSVP.',
    fields: [
      { name: 'completeAttendingTitle', label: 'Title (Attending)' },
      { name: 'completeAttendingMessage', label: 'Message (Attending)', multiline: true },
      { name: 'completeDecliningTitle', label: 'Title (Declining)' },
      { name: 'completeDecliningMessage', label: 'Message (Declining)', multiline: true },
    ],
  },
];

export default function DashboardRsvpForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: copy, isLoading } = useGetRsvpFormCopy();
  const updateCopy = useUpdateRsvpFormCopy();
  const initialized = useRef(false);

  const emptyDefaults = Object.fromEntries(
    FIELD_GROUPS.flatMap((group) => group.fields.map((f) => [f.name, ''])),
  ) as CopyValues;

  const form = useForm<CopyValues>({
    resolver: zodResolver(copySchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (copy && !initialized.current) {
      initialized.current = true;
      form.reset(copy);
    }
  }, [copy, form]);

  const onSubmit = (values: CopyValues) => {
    updateCopy.mutate({ data: values }, {
      onSuccess: (updated) => {
        toast({ title: 'RSVP form text updated' });
        queryClient.setQueryData(getGetRsvpFormCopyQueryKey(), updated);
      },
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Failed to save',
          description: err.data?.error || 'An error occurred.',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">RSVP Form</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">RSVP Form</h1>
        <p className="text-muted-foreground mt-1">Edit every question and label shown on the public RSVP page.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {FIELD_GROUPS.map((group) => (
            <Card key={group.title} className="border-none shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-serif text-primary">{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.fields.map((f) => (
                  <FormField
                    key={f.name}
                    control={form.control}
                    name={f.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{f.label}</FormLabel>
                        <FormControl>
                          {f.multiline ? (
                            <Textarea rows={2} {...field} />
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>
          ))}

          <Button type="submit" size="lg" disabled={updateCopy.isPending}>
            {updateCopy.isPending ? 'Saving...' : 'Save RSVP Form Text'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
