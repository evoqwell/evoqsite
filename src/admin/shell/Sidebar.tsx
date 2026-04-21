import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, Tag, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useOrderCounts } from '../hooks/useOrders';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/promos', label: 'Promos', icon: Tag },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

type Props = {
  /** Called after any nav link is activated. Used by the mobile Sheet wrapper
   *  to auto-close on navigation. Desktop usage leaves this undefined. */
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: Props = {}) {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const { data: counts } = useOrderCounts();

  const pendingCount = (counts?.pending_payment ?? 0) + (counts?.paid ?? 0);

  async function handleLogout() {
    await logout();
    navigate('/admin', { replace: true });
  }

  return (
    <aside className="w-60 shrink-0 border-r bg-white flex flex-col h-full">
      <div className="h-14 border-b flex items-center px-4 gap-2">
        <div className="h-6 w-6 rounded bg-brand-brown" />
        <span className="font-semibold">EVOQ</span>
        <span className="text-xs text-muted-foreground ml-auto uppercase tracking-wider">Admin</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                'text-slate-700 hover:bg-slate-100',
                isActive && 'bg-slate-100 text-brand-brown-dark font-medium border-l-2 border-brand-brown -ml-[2px] pl-[calc(0.75rem-2px)]'
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {to === '/admin/orders' && pendingCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {pendingCount}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-3" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
