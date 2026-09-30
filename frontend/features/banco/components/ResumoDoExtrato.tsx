"use client";

import { cartoesDoResumo, valorComSinal } from "../banco-da-tela";
import type { ResumoDoExtrato as Resumo } from "../services/banco";

/**
 * Quanto entrou, quanto saiu, e para onde — no período e no lugar filtrados.
 *
 * Os três tipos lado a lado porque é essa a pergunta da gerência: quanto foi
 * pagamento, quanto só mudou de conta, quanto entrou de venda. No
 * consolidado, a transferência entre lojas já vem fora da conta do servidor, e
 * a tela diz isso — senão alguém soma as lojas na mão e acha que o número não
 * bate.
 */
export function ResumoDoExtrato({ resumo }: { resumo: Resumo }) {
  return (
    <section className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap gap-[12px]">
        {cartoesDoResumo(resumo).map((cartao) => (
          <div
            key={cartao.rotulo}
            className={`min-w-[160px] flex-1 rounded-[12px] border px-[18px] py-[14px] ${
              cartao.destaque === "alerta"
                ? "border-caixa-warn/40 bg-caixa-warn-soft"
                : "border-caixa-border bg-caixa-surface"
            }`}
          >
            <p className="text-[13px] text-caixa-muted">{cartao.rotulo}</p>
            <p
              className={`text-[20px] font-semibold tabular-nums ${
                cartao.destaque === "alerta" ? "text-caixa-warn" : ""
              }`}
            >
              {cartao.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-[12px] md:grid-cols-3">
        {resumo.por_tipo.map((bloco) => (
          <div
            key={bloco.tipo}
            className="rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[14px]"
          >
            <div className="flex items-baseline justify-between gap-[8px]">
              <h2 className="text-[15px] font-semibold">{bloco.nome}</h2>
              <span className="text-[15px] font-semibold tabular-nums">
                {valorComSinal(bloco.valor)}
              </span>
            </div>
            {bloco.categorias.length === 0 ? (
              <p className="mt-[8px] text-[14px] text-caixa-muted">Nada classificado aqui.</p>
            ) : (
              <ul className="mt-[8px] flex flex-col gap-[4px]">
                {bloco.categorias.map((categoria) => (
                  <li
                    key={`${categoria.id}-${categoria.nome}`}
                    className="flex items-baseline justify-between gap-[8px] text-[14px]"
                  >
                    <span className="text-caixa-muted">{categoria.nome}</span>
                    <span className="tabular-nums">{valorComSinal(categoria.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {resumo.consolidado && (
        <p className="text-[13px] leading-[1.4] text-caixa-muted">
          Todas as lojas juntas: as transferências entre lojas ficam fora da conta, porque o
          dinheiro só mudou de uma loja para a outra. Filtre uma loja para vê-las.
        </p>
      )}
    </section>
  );
}
