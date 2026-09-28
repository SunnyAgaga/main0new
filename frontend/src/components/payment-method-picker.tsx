import type { PaymentMethods } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Landmark, Clock } from 'lucide-react';

interface PaymentMethodPickerProps {
  paymentMethods: PaymentMethods | undefined;
  onFlutterwave: () => void;
  onBankTransfer: () => void;
  onPayLater: () => void;
  isFlutterwavePending: boolean;
  isBankTransferPending: boolean;
  isPayLaterPending: boolean;
}

function OrDivider() {
  return (
    <div className="relative flex py-2 items-center">
      <div className="flex-grow border-t border-border"></div>
      <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm font-medium">OR</span>
      <div className="flex-grow border-t border-border"></div>
    </div>
  );
}

export function PaymentMethodPicker({
  paymentMethods,
  onFlutterwave,
  onBankTransfer,
  onPayLater,
  isFlutterwavePending,
  isBankTransferPending,
  isPayLaterPending,
}: PaymentMethodPickerProps) {
  return (
    <div className="space-y-4">

      {paymentMethods?.flutterwaveEnabled && (
        <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={onFlutterwave}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#F5A623]/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-[#F5A623]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Pay online (Flutterwave)</h4>
              <p className="text-sm text-muted-foreground">Instant confirmation via Card, USSD, or Bank Transfer</p>
            </div>
            {isFlutterwavePending ? (
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : null}
          </CardContent>
        </Card>
      )}

      {paymentMethods?.flutterwaveEnabled && paymentMethods?.bankTransferEnabled && <OrDivider />}

      {paymentMethods?.bankTransferEnabled && (
        <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={onBankTransfer}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Manual Bank Transfer</h4>
              <p className="text-sm text-muted-foreground">We will verify your payment manually</p>
            </div>
            {isBankTransferPending ? (
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : null}
          </CardContent>
        </Card>
      )}

      {paymentMethods?.payLaterEnabled && (paymentMethods?.flutterwaveEnabled || paymentMethods?.bankTransferEnabled) && <OrDivider />}

      {paymentMethods?.payLaterEnabled && (
        <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={onPayLater}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Pay Later</h4>
              <p className="text-sm text-muted-foreground">Record your order now and pay in person at the event</p>
            </div>
            {isPayLaterPending ? (
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : null}
          </CardContent>
        </Card>
      )}

      {paymentMethods && !paymentMethods.flutterwaveEnabled && !paymentMethods.bankTransferEnabled && !paymentMethods.payLaterEnabled && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No payment method is available right now. Please contact the couple directly.
        </p>
      )}

    </div>
  );
}
