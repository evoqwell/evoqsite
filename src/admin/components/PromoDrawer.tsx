import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ConfirmDialog } from './ConfirmDialog';
import {
  useCreatePromo,
  useDeletePromo,
  useUpdatePromo,
} from '../hooks/usePromos';
import type { Promo, PromoDiscountType } from '../types';

export type PromoDraft = {
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  description: string;
  isActive: boolean;
};

const EMPTY: PromoDraft = {
  code: '',
  discountType: 'percentage',
  discountValue: 0,
  description: '',
  isActive: true,
};

function fromPromo(p: Promo): PromoDraft {
  return {
    code: p.code,
    discountType: p.discountType,
    discountValue: p.discountValue ?? 0,
    description: p.description ?? '',
    isActive: p.isActive ?? true,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promo: Promo | null;
};

export function PromoDrawer({ open, onOpenChange, promo }: Props) {
  const isNew = !promo;
  const [draft, setDraft] = useState<PromoDraft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const create = useCreatePromo();
  const update = useUpdatePromo();
  const del = useDeletePromo();

  useEffect(() => {
    if (open) {
      setDraft(promo ? fromPromo(promo) : EMPTY);
      setDirty(false);
    }
  }, [open, promo]);

  function set<K extends keyof PromoDraft>(k: K, v: PromoDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  }

  async function save() {
    const payload = {
      code: draft.code.trim(),
      discountType: draft.discountType,
      discountValue: Number(draft.discountValue),
      description: draft.description,
      isActive: draft.isActive,
    };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ code: promo!.code, payload });
      toast.success(isNew ? 'Promo created' : 'Promo updated');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!promo) return;
    try {
      await del.mutateAsync(promo.code);
      toast.success('Promo deleted');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {isNew ? 'Add promo' : `Edit ${promo?.code ?? ''}`}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={draft.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              disabled={!isNew}
              placeholder="SUMMER20"
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount type</Label>
              <Select
                value={draft.discountType}
                onValueChange={(v) =>
                  set('discountType', v as PromoDiscountType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Discount value
                {draft.discountType === 'percentage' ? ' (%)' : ' (USD)'}
              </Label>
              <Input
                type="number"
                step={draft.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                value={draft.discountValue}
                onChange={(e) =>
                  set('discountValue', Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional customer-facing description"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive promos cannot be redeemed at checkout.
              </p>
            </div>
            <Switch
              checked={draft.isActive}
              onCheckedChange={(v) => set('isActive', v)}
            />
          </div>
        </div>
        <SheetFooter className="gap-2 pt-4 border-t">
          {!isNew && (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!dirty && !isNew}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
      {!isNew && promo && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${promo.code}?`}
          description="This cannot be undone."
          confirmText="Delete"
          confirmVariant="destructive"
          onConfirm={handleDelete}
          typeToConfirm={promo.code}
        />
      )}
    </Sheet>
  );
}
