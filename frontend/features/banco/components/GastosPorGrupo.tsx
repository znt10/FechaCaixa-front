import { emReais } from "@/features/fechamento/painel-dados";

import type { GastoDoGrupo } from "../graficos-do-extrato";
import { COR_SAIDA } from "./GraficoDoFluxo";

/**
 * Para onde foi o dinheiro: os pagamentos do período somados por grupo do
 * plano de contas, do maior para o menor. Uma série só, então sem legenda: o
 * título diz o que é, e cada barra traz o nome e o valor escritos.
 *
 * O que ainda não foi classificado não entra aqui; o aviso do topo do
 * extrato é que chama para classificar.
 */
export function GastosPorGrupo({ gastos, pendentes }: { gastos: GastoDoGrupo[]; pendentes: number }) {
  const maior = Math.max(0, ...gastos.map((gasto) => gasto.valor));

  return (
    <figure className="cartao-caixa flex flex-col gap-[12px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[18px] md:px-[24px]">
      <figcaption className="flex flex-col gap-[2px]">
        <span className="text-[16px] font-bold text-caixa-ink">Para onde foi o dinheiro</span>
        <span className="text-[13px] text-caixa-muted">Pagamentos classificados, por grupo</span>
      </figcaption>

      {gastos.length === 0 ? (
        <p className="text-[14px] text-caixa-muted">Nenhum pagamento classificado no período.</p>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {gastos.map((gasto) => (
            <li key={gasto.nome} className="flex flex-col gap-[4px]" title={`${gasto.nome}: R$ ${emReais(gasto.valor)}`}>
              <div className="flex items-baseline justify-between gap-[8px] text-[14px]">
                <span className="text-caixa-ink">{gasto.nome}</span>
                <span className="tabular-nums font-semibold text-caixa-ink">R$ {emReais(gasto.valor)}</span>
              </div>
              <div className="h-[10px] w-full rounded-[4px] bg-caixa-faixa">
                <div
                  className="h-full rounded-[4px]"
                  style={{ width: `${maior ? (gasto.valor / maior) * 100 : 0}%`, background: COR_SAIDA }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendentes > 0 && (
        <p className="text-[13px] text-caixa-alerta">
          {pendentes === 1
            ? "1 movimentação ainda sem categoria fica fora deste gráfico."
            : `${pendentes} movimentações ainda sem categoria ficam fora deste gráfico.`}
        </p>
      )}
    </figure>
  );
}
