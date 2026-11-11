import { initialsOf, type PublicUser } from '@livro-caixa/domain';
import { ChevronDown, LogOut, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLogout } from '@/features/auth/api';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

export function UserMenu({ user }: { user: PublicUser }) {
  const { t } = usePreferences();
  const logout = useLogout();
  const navigate = useNavigate();
  const initials = initialsOf(user.name);

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => navigate('/entrar', { replace: true, state: { notice: t('login.loggedOut') } }),
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('shell.account', user.name)}
        className="flex min-h-11 items-center gap-2 rounded-full border-0 bg-transparent py-0 pr-2.5 pl-[5px] text-background outline-none hover:bg-header-active focus-visible:ring-2 focus-visible:ring-mint data-[state=open]:bg-header-active"
      >
        <span
          aria-hidden="true"
          className="flex size-[34px] items-center justify-center rounded-full bg-mint text-[13px] font-bold text-ink"
        >
          {initials}
        </span>
        <ChevronDown className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[264px] overflow-hidden rounded-xl border-border p-0 shadow-[0_16px_40px_rgba(23,32,28,0.22)]"
      >
        <DropdownMenuLabel className="flex items-center gap-3 border-b border-divider px-4 py-3.5 font-normal">
          <span
            aria-hidden="true"
            className="flex size-[38px] flex-none items-center justify-center rounded-full bg-ink text-sm font-bold text-mint"
          >
            {initials}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-bold">{user.name}</span>
            <span className="truncate text-[13px] text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => navigate('/configuracoes')}
          className="min-h-11 gap-2.5 rounded-none px-4 text-sm font-semibold text-ink focus:bg-background"
        >
          <SlidersHorizontal className="size-[17px] text-ink" aria-hidden="true" />
          {t('nav.settings')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={signOut}
          className="min-h-11 gap-2.5 rounded-none px-4 text-sm font-semibold text-expense focus:bg-expense-row focus:text-expense"
        >
          <LogOut className="size-[17px] text-expense" aria-hidden="true" />
          {t('shell.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
