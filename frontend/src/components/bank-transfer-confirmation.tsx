import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { customFetch, ApiError } from '@/api/custom-fetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Landmark, CheckCircle2, Upload } from 'lucide-react';

export interface BankDetails {
  reference: string;
  amount: number;
  currency: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

export function BankTransferConfirmation({ bankDetails, title }: { bankDetails: BankDetails; title: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reference', bankDetails.reference);
      if (file) formData.append('file', file);
      await customFetch('/api/checkout/confirm-transfer', { method: 'POST', body: formData });
      setConfirmed(true);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not confirm payment',
        description: err instanceof ApiError ? (err.data as { error?: string } | null)?.error || err.message : 'An error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-lg w-full border-none shadow-xl bg-card animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Landmark className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">{title}</CardTitle>
          <CardDescription>
            Please transfer exactly <strong>{bankDetails.currency} {bankDetails.amount.toLocaleString()}</strong> to the account below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground text-sm">Bank Name</span>
              <span className="font-semibold">{bankDetails.bankName}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground text-sm">Account Name</span>
              <span className="font-semibold">{bankDetails.accountName}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground text-sm">Account Number</span>
              <span className="font-mono font-bold tracking-wider">{bankDetails.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Reference</span>
              <span className="font-mono text-primary font-bold">{bankDetails.reference}</span>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground bg-primary/5 p-3 rounded text-primary">
            {bankDetails.instructions}
          </p>

          {confirmed ? (
            <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 text-sm font-medium py-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              Thanks — we'll confirm your payment shortly.
            </div>
          ) : (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Already sent the transfer?</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                {file ? file.name : 'Attach a screenshot (optional)'}
              </Button>
              <Button type="button" className="w-full" disabled={submitting} onClick={handleConfirm}>
                {submitting ? 'Confirming…' : "I've Sent My Payment"}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full h-12" onClick={() => setLocation('/')}>
            Return Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
