import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useLogin, getGetAuthMeQueryKey } from '@/api';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const login = useLogin();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: SignInFormValues) => {
    login.mutate(
      { data: values },
      {
        onSuccess: (user) => {
          queryClient.setQueryData(getGetAuthMeQueryKey(), user);
          // react-query's mutation lifecycle runs onSuccess inside its own
          // notifyManager batch, so the cache-write notification above is
          // only scheduled (via setTimeout(0)) *after* this callback returns
          // — a plain single setTimeout(0) for navigation would still race
          // ahead of it. Nesting one more macrotask lets that flush run first.
          setTimeout(() => setTimeout(() => setLocation('/dashboard'), 0), 0);
        },
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Sign in failed',
            description: err.data?.error || 'Invalid email or password.',
          });
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="WedPlan Logo" className="h-10 object-contain" />
        </div>
        <Card className="border-none shadow-xl bg-card">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl font-serif font-bold text-foreground text-center mb-6">Sign in</h1>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={login.isPending}>
                  {login.isPending ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
