import type { MessageKey } from '@livro-caixa/domain';
import { ChartColumn, Landmark, LayoutDashboard, ReceiptText, SlidersHorizontal } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { useCurrentUser } from '@/features/auth/api';
import { LedgerIcon } from '@/shared/brand/LedgerIcon';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import { UserMenu } from './UserMenu';

/**
 * Sections, in the design's order. On phones the nav is a bar at the bottom of the screen, which
 * has room for four items: Configurações stays in the account menu there.
 */
const NAV_ITEMS = [
  { to: '/visao-geral', label: 'nav.overview', icon: LayoutDashboard, onPhoneBar: true },
  { to: '/lancamentos', label: 'nav.entries', icon: ReceiptText, onPhoneBar: true },
  { to: '/patrimonio', label: 'nav.wealth', icon: Landmark, onPhoneBar: true },
  { to: '/resumo', label: 'nav.summary', icon: ChartColumn, onPhoneBar: true },
  { to: '/configuracoes', label: 'nav.settings', icon: SlidersHorizontal, onPhoneBar: false },
] as const satisfies readonly { to: string; label: MessageKey; icon: unknown; onPhoneBar: boolean }[];

export function AppShell() {
  const { data: user } = useCurrentUser();
  const { t } = usePreferences();
  if (!user) return null;

  return (
    <>
      <header className="bg-ink text-background md:top-0 md:z-40 md:tall:sticky">
        <div className="mx-auto flex min-h-14 max-w-[1280px] flex-wrap items-center gap-x-4 px-4 sm:px-6 md:min-h-(--sticky-header-height) md:gap-y-1 md:py-2 lg:py-0">
          <div className="mr-auto flex items-center gap-2.5">
            <LedgerIcon />
            <span className="text-lg font-bold tracking-[-0.01em]">Livro-caixa</span>
          </div>
          {/* A bar along the bottom on phones, its own header row on tablets, inline from 1024px. The header sticks to the top from 768px on tall screens, so the nav is always in reach; on phones, upright or sideways, it scrolls away. */}
          <nav
            aria-label={t('nav.main')}
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-header-active bg-ink pb-[env(safe-area-inset-bottom)] md:static md:z-auto md:order-last md:basis-full md:gap-1 md:border-0 md:pb-0 lg:order-none lg:basis-auto"
          >
            {NAV_ITEMS.map(({ to, label, icon: Icon, onPhoneBar }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'group min-h-(--phone-nav-height) flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold no-underline',
                    'md:min-h-11 md:flex-none md:flex-row md:rounded-[10px] md:px-4 md:text-[15px]',
                    onPhoneBar ? 'flex' : 'hidden md:flex',
                    isActive ? 'text-white md:bg-header-active' : 'text-on-dark-muted hover:text-white',
                  )
                }
              >
                <Icon
                  className="size-5 group-aria-[current=page]:text-mint md:hidden"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {t(label)}
              </NavLink>
            ))}
          </nav>
          <UserMenu user={user} />
        </div>
      </header>
      {/* The bottom padding keeps the last of a page clear of the phone's nav bar. */}
      <main className="pb-(--phone-nav-clearance)">
        <Outlet />
      </main>
    </>
  );
}
