"use client";

import Link from "next/link";

/**
 * As duas portas do app instalado.
 *
 * O manifest tem um `start_url` so (/fechamento) para todas as empresas, e ate
 * aqui ele levava a um lugar so: a tela do codigo. Quem instalava o app no
 * proprio celular para usar o painel ficava sem saida — num app instalado nao
 * ha barra de endereco onde digitar /login, entao o painel era inalcancavel
 * pelo celular.
 *
 * Aparece apenas no aparelho que ainda nao digitou o codigo. Assim que o
 * codigo entra, o cookie de 180 dias manda direto para o formulario e esta
 * tela some para sempre: quem fecha o caixa as 22h nao ganhou um toque a mais.
 *
 * O formulario e o botao cheio e o painel e o vazado porque a proporcao e essa
 * — sao dezenas de lancamentos por mes contra um login de gerencia. A linha
 * embaixo de cada botao diz de quem e cada porta, para o funcionario nao ficar
 * decidindo entre dois nomes parecidos.
 */
export function EscolhaDaPorta({
  aoEscolherFormulario,
}: {
  aoEscolherFormulario: () => void;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-caixa-bg px-[20px] py-[40px] font-sans text-caixa-ink">
      <div className="cartao-caixa flex w-full max-w-[420px] flex-col gap-[22px] rounded-[16px] border border-caixa-border bg-caixa-surface p-[28px]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[22px] font-bold leading-[1.25]">
            Fechamento de Caixa
          </h1>
          <p className="text-[14px] leading-[1.45] text-caixa-muted">
            O que você vai fazer neste aparelho?
          </p>
        </div>

        <div className="flex flex-col gap-[14px]">
          <div className="flex flex-col gap-[7px]">
            <button
              type="button"
              onClick={aoEscolherFormulario}
              className="h-[52px] rounded-[10px] bg-caixa-accent text-[16px] font-semibold text-white transition hover:brightness-110"
            >
              Lançar o fechamento
            </button>
            <p className="text-[13px] leading-[1.4] text-caixa-muted">
              Para o celular da loja. Pede o código da empresa uma vez só.
            </p>
          </div>

          <div className="flex flex-col gap-[7px]">
            <Link
              href="/login"
              className="flex h-[52px] items-center justify-center rounded-[10px] border border-caixa-border bg-caixa-surface text-[16px] font-semibold text-caixa-ink transition hover:border-caixa-accent hover:text-caixa-accent"
            >
              Entrar no painel
            </Link>
            <p className="text-[13px] leading-[1.4] text-caixa-muted">
              Para a gerência, com e-mail e senha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
