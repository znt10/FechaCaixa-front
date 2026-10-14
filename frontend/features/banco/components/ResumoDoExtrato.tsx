"use client";

import { emReais } from "@/features/fechamento/painel-dados";

import { arvoreDoBloco, avisoDePendentes, saldoDoResumo, valorComSinal } from "../banco-da-tela";
import type { ResumoDoExtrato as Resumo } from "../services/banco";

/**
 * Quanto entrou, quanto saiu, e para onde — no período e no lugar filtrados.
 *
 * Mesma ordem do fechamento de caixa e dos comprovantes: o aviso do que falta,
 * o total grande, e embaixo de onde ele veio. Os três tipos lado a lado porque
 * é essa a pergunta da gerência: quanto foi pagamento, quanto só mudou de
 * conta, quanto entrou de venda. No consolidado, a transferência entre lojas
 * já vem fora da conta do servidor, e a tela diz isso — senão alguém soma as
 * lojas na mão e acha que o número não bate.
 */
export function ResumoDoExtrato({
  resumo,
  rotulo,
  onVerPendentes,
}: {
  resumo: Resumo;
  rotulo: string;
  /** Ausente quando a lista já mostra só as que faltam. */
  onVerPendentes?: () => void;
}) {
  const saldo = saldoDoResumo(resumo);

  return (
    <section className="flex flex-col gap-[16px]">
      {/* Em cima do total, como o "1 loja ainda não lançou": a pendente soma no
          que entrou e saiu, mas ainda não tem lugar na árvore lá embaixo. */}
      {resumo.pendentes.quantidade > 0 && (
        <div className="cartao-caixa flex items-start gap-[16px] rounded-[12px] border border-caixa-alerta/35 border-l-[6px] border-l-caixa-alerta bg-caixa-alerta-soft px-[16px] py-[18px] md:px-[24px] md:py-[20px]">
          <span className="mt-[6px] h-[12px] w-[12px] shrink-0 rounded-full bg-caixa-alerta" />
          <div className="flex flex-col gap-[8px]">
            <span className="text-[17px] font-bold leading-[1.3] text-caixa-alerta">
              {avisoDePendentes(resumo.pendentes.quantidade)}
            </span>
            <span className="text-[14px] text-caixa-alerta">
              Elas já contam no que entrou e saiu, mas ainda não aparecem na divisão por tipo.
            </span>
            {onVerPendentes && (
              <button
                type="button"
                onClick={onVerPendentes}
                className="w-fit rounded-[8px] bg-caixa-surface px-[12px] py-[6px] text-[16px] font-semibold text-caixa-alerta"
              >
                Ver para classificar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="cartao-caixa rounded-[12px] bg-caixa-total px-[18px] py-[20px] text-caixa-accent md:px-[28px] md:py-[24px]">
        <div className="grid gap-[20px] md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12px] font-semibold uppercase tracking-[0.6px]">{rotulo}</span>
            <span className="text-[42px] font-bold leading-[1.05] tabular-nums">
              {valorComSinal(saldo)}
            </span>
          </div>

          <div className="flex w-full flex-col gap-[8px] md:w-[300px] md:border-l md:border-caixa-accent/20 md:pl-[28px]">
            <div className="flex justify-between gap-[8px] text-[14px]">
              <span>Entrou</span>
              <span className="font-semibold tabular-nums">
                R$ {emReais(Number(resumo.entradas))}
              </span>
            </div>
            <div className="flex justify-between gap-[8px] text-[14px]">
              <span>Saiu</span>
              <span className="font-semibold tabular-nums">
                R$ {emReais(Math.abs(Number(resumo.saidas)))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-[16px] md:grid-cols-3">
        {resumo.por_tipo.map((bloco) => {
          const arvore = arvoreDoBloco(bloco);
          return (
            <div
              key={bloco.tipo}
              className="cartao-caixa rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[16px]"
            >
              <div className="flex items-baseline justify-between gap-[8px]">
                <h2 className="text-[15px] font-semibold">{bloco.nome}</h2>
                <span className="text-[15px] font-semibold tabular-nums">
                  {valorComSinal(bloco.valor)}
                </span>
              </div>
              {arvore.length === 0 ? (
                <p className="mt-[10px] text-[14px] text-caixa-muted">Nada classificado aqui.</p>
              ) : (
                <ul className="mt-[10px] flex flex-col gap-[8px]">
                  {arvore.map((no) => (
                    <li key={no.chave}>
                      <LinhaDaArvore nome={no.nome} valor={no.valor} quantidade={no.quantidade} />
                      {/* O fio da esquerda é o que diz "isto é de dentro do
                          grupo" sem repetir o nome dele em cada linha. */}
                      {no.filhos.length > 0 && (
                        <ul className="ml-[4px] mt-[4px] flex flex-col gap-[3px] border-l border-caixa-border pl-[12px]">
                          {no.filhos.map((folha) => (
                            <li key={folha.chave}>
                              <LinhaDaArvore
                                nome={folha.nome}
                                valor={folha.valor}
                                quantidade={folha.quantidade}
                                dentro
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {resumo.consolidado && (
        <p className="text-[13px] leading-[1.4] text-caixa-muted">
          Todas as lojas juntas: as transferências entre lojas ficam fora da conta, porque o
          dinheiro só mudou de uma loja para a outra. Escolha uma loja para vê-las.
        </p>
      )}
    </section>
  );
}

function LinhaDaArvore({
  nome,
  valor,
  quantidade,
  dentro = false,
}: {
  nome: string;
  valor: number;
  quantidade: number;
  dentro?: boolean;
}) {
  return (
    <div
      title={quantidade === 1 ? "1 movimentação" : `${quantidade} movimentações`}
      className={`flex items-baseline justify-between gap-[8px] text-[14px] ${
        dentro ? "text-caixa-muted" : "font-medium text-caixa-ink"
      }`}
    >
      <span>{nome}</span>
      <span className="tabular-nums">{valorComSinal(valor)}</span>
    </div>
  );
}
