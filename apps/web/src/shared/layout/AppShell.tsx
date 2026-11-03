import { NavLink, Outlet } from 'react-router';
import { useCurrentUser } from '@/features/auth/api';
import { LedgerIcon } from '@/shared/brand/LedgerIcon';
import { cn } from '@/shared/lib/utils';
import { UserMenu } from './UserMenu';

/** Sections join this list, in the design's order, as they are built. */
const NAV_ITEMS = [
  { to: '/visao-geral', label: 'Visão geral' },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/resumo', label: 'Resumo mensal' },
  { to: '/configuracoes', label: 'Configurações' },
];

export function AppShell() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <>
      <header className="bg-ink text-background">
        <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-2.5">
            <LedgerIcon />
            <span className="text-lg font-bold tracking-[-0.01em]">Livro-caixa</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <nav aria-label="Principal" className="flex flex-wrap gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center rounded-[10px] px-4 font-semibold no-underline',
                      isActive ? 'bg-header-active text-white' : 'text-on-dark-muted hover:text-white',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
