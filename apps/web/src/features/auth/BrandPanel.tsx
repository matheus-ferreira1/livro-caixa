import { Code, Lock, Server } from 'lucide-react';
import { LedgerIcon } from '@/shared/brand/LedgerIcon';

const FEATURES = [
  { icon: Server, text: 'Roda em Docker, local ou em qualquer servidor' },
  { icon: Code, text: 'Código aberto, sem conta em serviço de terceiros' },
  { icon: Lock, text: 'Acesso protegido por login em cada instância' },
];

// On phones the panel shrinks to the logo and headline, so the form is on the first screen.
export function BrandPanel() {
  return (
    <section
      aria-label="Sobre o Livro-caixa"
      className="ruled-panel flex flex-col justify-between gap-5 px-[clamp(24px,5vw,72px)] py-6 text-background sm:min-h-[360px] sm:flex-[1_1_440px] sm:gap-12 sm:py-10"
    >
      <div className="flex items-center gap-2.5">
        <LedgerIcon size={28} />
        <span className="text-[19px] font-bold tracking-[-0.01em]">Livro-caixa</span>
      </div>
      <div className="flex max-w-[480px] flex-col gap-5">
        <h1 className="m-0 text-[clamp(28px,4vw,50px)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
          Suas finanças, no seu servidor.
        </h1>
        <p className="m-0 text-[17px] text-pretty text-on-dark-muted max-sm:hidden">
          Lançamentos, contas divididas e acerto do mês num app que você mesmo hospeda. Os dados ficam só na
          sua instância.
        </p>
        <ul className="m-0 flex list-none flex-col gap-3 p-0 max-sm:hidden">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5">
              <Icon className="size-[18px] text-mint" strokeWidth={2} aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <span className="text-[13px] text-neutral-swatch max-sm:hidden">Livro-caixa · self-hosted</span>
    </section>
  );
}
