import type { ReactNode } from "react";

/** O cartão do Catálogo: título e explicação em cima, separados do conteúdo
 *  por uma linha, e a sombra que destaca do fundo. */
export function CartaoDeConfiguracao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <section className="cartao-caixa flex flex-col rounded-[12px] border border-caixa-border bg-caixa-surface">
      <header className="flex flex-col gap-[3px] border-b border-caixa-border px-[16px] py-[16px] md:px-[24px] md:py-[18px]">
        <h2 className="text-[17px] font-bold leading-[1.2]">{titulo}</h2>
        <p className="max-w-[70ch] text-[13px] leading-[1.4] text-caixa-muted">{descricao}</p>
      </header>
      <div className="flex flex-col gap-[14px] px-[16px] py-[18px] md:px-[24px] md:py-[20px]">{children}</div>
    </section>
  );
}
