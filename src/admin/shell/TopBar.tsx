import { useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, Search } from 'lucide-react';

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  promos: 'Promos',
  analytics: 'Analytics',
};

type Props = {
  onOpenPalette?: () => void;
  onOpenMobileNav?: () => void;
};

export function TopBar({ onOpenPalette, onOpenMobileNav }: Props = {}) {
  const location = useLocation();
  const params = useParams();
  const parts = location.pathname.split('/').filter(Boolean); // ['admin','orders','123']
  const section = parts[1] ?? 'dashboard';
  const title = TITLES[section] ?? '';

  const crumb = params.id ? `${title} › #${params.id}` : title;

  return (
    <header className="h-14 bg-white border-b px-4 sm:px-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden -ml-2"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-slate-900 truncate">{crumb}</h1>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground"
        onClick={onOpenPalette}
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5 mr-2" />
        <span className="text-xs">⌘K</span>
      </Button>
    </header>
  );
}
