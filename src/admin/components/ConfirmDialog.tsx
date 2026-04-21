import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  typeToConfirm?: string;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  confirmVariant = 'default',
  onConfirm,
  typeToConfirm,
}: Props) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const canConfirm = !typeToConfirm || value === typeToConfirm;

  async function handle() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setValue('');
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {typeToConfirm && (
          <div className="space-y-2">
            <div className="text-sm">
              Type <code className="bg-slate-100 px-1 rounded">{typeToConfirm}</code>{' '}
              to confirm.
            </div>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!canConfirm || busy}
            onClick={handle}
          >
            {busy ? 'Working…' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
