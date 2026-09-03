import { CreditCard, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useStorefrontSettings,
  useUpdateStorefrontSettings,
} from '../hooks/useStorefrontSettings';

export function SettingsPage() {
  const settings = useStorefrontSettings();
  const updateSettings = useUpdateStorefrontSettings();
  const cardPaymentsEnabled = settings.data?.cardPaymentsEnabled ?? true;

  async function handleCardPaymentsChange(enabled: boolean) {
    try {
      await updateSettings.mutateAsync(enabled);
      toast.success(
        enabled
          ? 'Credit card option is visible at checkout.'
          : 'Credit card option is hidden from checkout.',
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not update checkout settings.',
      );
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
      </div>

      <section aria-labelledby="payment-settings-heading">
        <div className="mb-3">
          <h3 id="payment-settings-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Payment options
          </h3>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {settings.isLoading ? (
              <div className="flex items-center justify-between gap-6 p-6">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-4 w-full max-w-lg" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ) : settings.isError ? (
              <div className="p-6 text-sm text-destructive" role="alert">
                Settings could not be loaded. Refresh the page to try again.
              </div>
            ) : (
              <div className="flex items-start justify-between gap-6 p-6">
                <div className="flex min-w-0 gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-brand-brown-dark">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="card-payments-enabled" className="font-medium text-slate-900">
                        Credit card requests
                      </label>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          cardPaymentsEnabled ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {cardPaymentsEnabled ? (
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {cardPaymentsEnabled ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <p id="card-payments-description" className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                      When enabled, customers see the option for credit card payments.
                    </p>
                  </div>
                </div>

                <Switch
                  id="card-payments-enabled"
                  checked={cardPaymentsEnabled}
                  onCheckedChange={handleCardPaymentsChange}
                  disabled={updateSettings.isPending}
                  aria-describedby="card-payments-description"
                  aria-label="Allow credit card requests at checkout"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
