import { LOGIN_MESSAGES, validateLoginInput } from '@livro-caixa/domain';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '@/shared/api/client';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { AlertBanner, InfoBox, NoticeBanner } from '@/shared/ui-kit';
import { useCurrentUser, useLogin } from './api';
import { BrandPanel } from './BrandPanel';

const HOME_PATH = '/visao-geral';

interface LocationState {
  notice?: string;
  from?: string;
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as LocationState;
  const { data: currentUser } = useCurrentUser();
  const login = useLogin();
  const ids = { email: useId(), password: useId(), remember: useId() };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(state.notice ?? '');

  if (currentUser && !login.isPending) return <Navigate to={state.from ?? HOME_PATH} replace />;

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (login.isPending) return;
    const validationError = validateLoginInput({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }
    clearMessages();
    login.mutate(
      { email: email.trim(), password, remember },
      {
        onSuccess: () => navigate(state.from ?? HOME_PATH, { replace: true }),
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : LOGIN_MESSAGES.invalidCredentials);
          setPassword('');
        },
      },
    );
  };

  const fieldBorder = error ? 'border-expense' : 'border-input';

  return (
    <div className="flex min-h-screen flex-col sm:flex-row sm:flex-wrap">
      <BrandPanel />
      <div className="flex flex-[1_1_440px] items-center justify-center bg-background px-4 py-10 sm:px-6 sm:py-12">
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby="login-title"
          className="flex w-full max-w-[400px] flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id="login-title" className="m-0 text-[28px] font-bold tracking-[-0.02em]">
              Entrar
            </h2>
            <p className="m-0 text-muted-foreground">Use a conta criada na sua instância.</p>
          </div>

          {notice && <NoticeBanner>{notice}</NoticeBanner>}
          {error && <AlertBanner>{error}</AlertBanner>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.email} className="text-sm font-semibold">
              E-mail
            </Label>
            <Input
              id={ids.email}
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearMessages();
              }}
              className={cn('h-12 rounded-[10px] bg-card px-3.5 text-base shadow-none', fieldBorder)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.password} className="text-sm font-semibold">
              Senha
            </Label>
            <div
              className={cn(
                'flex min-h-12 items-center rounded-[10px] border bg-card pr-1 focus-within:ring-[3px] focus-within:ring-ring/50',
                fieldBorder,
              )}
            >
              <input
                id={ids.password}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearMessages();
                }}
                className="h-[46px] min-w-0 flex-1 rounded-[10px] border-0 bg-transparent px-3.5 text-base outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="flex size-10 items-center justify-center rounded-lg text-icon hover:bg-accent"
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" aria-hidden="true" />
                ) : (
                  <Eye className="size-[18px]" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-h-11 items-center gap-2.5">
              <Checkbox
                id={ids.remember}
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
                className="size-[18px] border-input data-[state=checked]:border-ink data-[state=checked]:bg-ink"
              />
              <Label htmlFor={ids.remember} className="cursor-pointer text-sm font-normal">
                Manter conectado neste dispositivo
              </Label>
            </div>
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              aria-expanded={showForgot}
              className="min-h-11 border-0 bg-transparent p-0 text-sm font-semibold text-settlement"
            >
              Esqueceu a senha?
            </button>
          </div>

          {showForgot && (
            <InfoBox>
              Como cada instância é hospedada por você, a senha é redefinida pelo administrador do servidor,
              com o comando de redefinição do container.
            </InfoBox>
          )}

          <Button
            type="submit"
            disabled={login.isPending}
            className="h-12 rounded-[10px] text-base font-semibold disabled:bg-icon disabled:opacity-100"
          >
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </Button>

          <p className="m-0 flex items-start gap-2 text-[13px] text-muted-foreground">
            <Lock className="mt-0.5 size-4 flex-none" aria-hidden="true" />
            Ainda sem conta? O primeiro acesso é criado pelo administrador ao configurar a instância.
          </p>
        </form>
      </div>
    </div>
  );
}
