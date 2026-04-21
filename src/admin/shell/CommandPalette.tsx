import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useOrdersList } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { usePromos } from '../hooks/usePromos';
import type { Product, Promo } from '../types';
import {
  NAV_ITEMS,
  buildCommandItems,
  type CommandItem as PaletteItem,
} from './buildCommandItems';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: productsData } = useProducts();
  // Palette only needs the 20 most-recent orders for fuzzy-match navigation —
  // no status filter, lean payload.
  const { data: ordersData } = useOrdersList({ limit: 20 });
  const { data: promosData } = usePromos();

  const items = useMemo(
    () =>
      buildCommandItems({
        products: (productsData ?? []) as Product[],
        orders: (ordersData?.items ?? []).map((o) => ({
          orderNumber: o.orderNumber,
          status: o.status,
          createdAt: o.createdAt,
          customer: {
            name: o.customer?.name ?? undefined,
            email: o.customer?.email ?? undefined,
          },
          items: [],
          totals: {
            subtotalCents: 0,
            discountCents: 0,
            shippingCents: 0,
            totalCents: o.totals.totalCents,
          },
        })),
        promos: (promosData ?? []) as Promo[],
      }),
    [productsData, ordersData, promosData],
  );

  const grouped = useMemo(() => {
    const byGroup: Record<PaletteItem['group'], PaletteItem[]> = {
      Navigation: [],
      Products: [],
      Orders: [],
      Promos: [],
    };
    for (const item of items) byGroup[item.group].push(item);
    return byGroup;
  }, [items]);

  function handleSelect(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={item.label}
              onSelect={() => handleSelect(item.to)}
            >
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {grouped.Products.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Products">
              {grouped.Products.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                  onSelect={() => handleSelect(item.to)}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {grouped.Orders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Orders">
              {grouped.Orders.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                  onSelect={() => handleSelect(item.to)}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {grouped.Promos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Promos">
              {grouped.Promos.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                  onSelect={() => handleSelect(item.to)}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
