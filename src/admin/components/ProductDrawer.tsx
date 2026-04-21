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
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from '../hooks/useProducts';
import type { Product, ProductStatus } from '../types';

export type ProductDraft = {
  sku: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  image: string;
  categories: string;
  coa: string;
  status: ProductStatus;
};

const EMPTY: ProductDraft = {
  sku: '',
  name: '',
  price: 0,
  stock: 0,
  description: '',
  image: '',
  categories: '',
  coa: '',
  status: 'active',
};

function fromProduct(p: Product): ProductDraft {
  const status =
    p.status === 'active' || p.status === 'coming_soon' || p.status === 'inactive'
      ? p.status
      : 'active';
  return {
    sku: p.sku,
    name: p.name,
    price: p.price ?? 0,
    stock: p.stock ?? 0,
    description: p.description ?? '',
    image: p.image ?? '',
    categories: Array.isArray(p.categories) ? p.categories.join(', ') : '',
    coa: p.coa ?? '',
    status,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
};

export function ProductDrawer({ open, onOpenChange, product }: Props) {
  const isNew = !product;
  const [draft, setDraft] = useState<ProductDraft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const create = useCreateProduct();
  const update = useUpdateProduct();
  const del = useDeleteProduct();

  useEffect(() => {
    if (open) {
      setDraft(product ? fromProduct(product) : EMPTY);
      setDirty(false);
    }
  }, [open, product]);

  function set<K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  }

  async function save() {
    // Server expects `price` as a positive number (dollars). See
    // server/src/routes/adminProducts.js — the route itself converts to
    // priceCents on the way into Mongo. Do not pre-convert here.
    const payload = {
      sku: draft.sku,
      name: draft.name,
      description: draft.description,
      price: Number(draft.price),
      image: draft.image,
      categories: draft.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      coa: draft.coa,
      stock: Number(draft.stock),
      status: draft.status,
    };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ sku: product!.sku, payload });
      toast.success(isNew ? 'Product created' : 'Product updated');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!product) return;
    try {
      await del.mutateAsync(product.sku);
      toast.success('Product deleted');
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
            {isNew ? 'Add product' : `Edit ${product?.name ?? ''}`}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input
                value={draft.sku}
                onChange={(e) => set('sku', e.target.value)}
                disabled={!isNew}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Price (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draft.price}
                onChange={(e) => set('price', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input
                type="number"
                min="0"
                value={draft.stock}
                onChange={(e) => set('stock', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Image path</Label>
              <Input
                value={draft.image}
                onChange={(e) => set('image', e.target.value)}
                placeholder="/images/file.webp"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categories</Label>
              <Input
                value={draft.categories}
                onChange={(e) => set('categories', e.target.value)}
                placeholder="Peptide, Premium"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>COA path</Label>
              <Input
                value={draft.coa}
                onChange={(e) => set('coa', e.target.value)}
                placeholder="/COAs/filename.pdf"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => set('status', v as ProductStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="coming_soon">Coming soon</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
      {!isNew && product && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${product.name ?? 'product'}?`}
          description="This cannot be undone."
          confirmText="Delete"
          confirmVariant="destructive"
          onConfirm={handleDelete}
          typeToConfirm={product.sku}
        />
      )}
    </Sheet>
  );
}
