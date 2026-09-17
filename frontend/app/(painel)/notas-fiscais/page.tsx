"use client";

import { useMemo } from "react";

import { TabelaDeNotas } from "@/features/admin/components/TabelaDeNotas";
import { UploadDeNotas } from "@/features/admin/components/UploadDeNotas";
import { useEscolhasDeNotas } from "@/features/admin/hooks/useEscolhasDeNotas";
import { useNotas } from "@/features/admin/hooks/useNotas";
import {
  andarDePagina,
  montarFiltroDeNotas,
  resumoDaPagina,
  trocarDeFiltro,
  voltarParaPrimeiraPagina,
  type EscolhasDaTela,
} from "@/features/admin/notas-da-tela";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";

const CLASSE_FILTRO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

const CLASSE_PAGINADOR =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[9px] text-[14px] font-semibold text-caixa-ink transition hover:border-caixa-accent/40 disabled:opacity-40 disabled:hover:border-caixa-border";

/**
 * Notas fiscais.
 *
 * As outras telas do painel contam o que a loja lançou; esta conta o que a
 * empresa GASTOU, com o papel do fornecedor como prova. A gerência sobe os
 * XMLs do mês e diz de que é cada despesa — o resto (loja, fornecedor, valor,
 * data) já veio do próprio arquivo e não se digita.
 */
export default function NotasFiscaisPage() {
  const [escolhas, setEscolhas] = useEscolhasDeNotas();
  const lojas = useLojasDoPainel();

  const filtro = useMemo(() => montarFiltroDeNotas(escolhas), [escolhas]);
  const notas = useNotas(filtro);

  const escolher = (mudanca: Partial<EscolhasDaTela>) =>
    setEscolhas((atual) => trocarDeFiltro(atual, mudanca));

  const andar = (direcao: 1 | -1) => setEscolhas((atual) => andarDePagina(atual, direcao));

  const resumo = notas.data ? resumoDaPagina(notas.data, escolhas.pagina) : null;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] md:px-[40px] pb-[60px]">
      <div className="flex flex-col gap-[2px] py-[28px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Notas fiscais</h1>
        <p className="text-[14px] leading-[1.4] text-caixa-muted">
          Suba os XMLs das compras e diga de que é cada gasto.
        </p>
      </div>

      <div className="flex flex-col gap-[20px]">
        <UploadDeNotas />

        <div className="flex flex-wrap items-center gap-[12px]">
          <label className="flex items-center gap-[8px] text-[14px] leading-[1.4]">
            <input
              type="checkbox"
              checked={escolhas.soPendentes}
              onChange={(evento) => escolher({ soPendentes: evento.target.checked })}
              className="h-[16px] w-[16px] accent-caixa-accent"
            />
            Só as que faltam classificar
          </label>

          <select
            aria-label="Loja"
            value={escolhas.loja}
            onChange={(evento) => escolher({ loja: evento.target.value })}
            className={CLASSE_FILTRO}
          >
            <option value="">Todas as lojas</option>
            {(lojas.data ?? []).map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome_loja}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-[8px] text-[14px] text-caixa-muted">
            De
            <input
              type="date"
              value={escolhas.de}
              onChange={(evento) => escolher({ de: evento.target.value })}
              className={CLASSE_FILTRO}
            />
          </label>

          <label className="flex items-center gap-[8px] text-[14px] text-caixa-muted">
            Até
            <input
              type="date"
              value={escolhas.ate}
              onChange={(evento) => escolher({ ate: evento.target.value })}
              className={CLASSE_FILTRO}
            />
          </label>
        </div>

        {notas.error && (
          <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[20px] py-[16px]">
            <p className="text-[14px] font-medium text-caixa-alerta">
              {notas.error instanceof Error
                ? notas.error.message
                : "Não foi possível carregar as notas."}
              {escolhas.pagina > 1 &&
                " A lista pode ter mudado e esta página deixado de existir."}
            </p>

            {/* A saída da página que sumiu. Sem resposta do servidor não há
                faixa nem botões de navegação, e a tela ficava num aviso do
                qual só se saía recarregando. */}
            {escolhas.pagina > 1 && (
              <button
                type="button"
                onClick={() => setEscolhas(voltarParaPrimeiraPagina)}
                className={CLASSE_PAGINADOR}
              >
                Voltar para a primeira página
              </button>
            )}
          </div>
        )}

        <TabelaDeNotas notas={notas.data?.results ?? []} carregando={notas.isPending} />

        {/* O paginador existe porque um mês de oito lojas passa de 50 notas
            fácil: sem ele, a tela mostraria a primeira página e a despesa que
            faltava ficaria escondida na quarta. */}
        {resumo && (resumo.texto || resumo.temAnterior || resumo.temProxima) && (
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            {/* Sem faixa quando não há nota nenhuma: a tabela acima já disse
                isso, e repetir embaixo dava o mesmo recado duas vezes. */}
            <span aria-live="polite" className="text-[14px] text-caixa-muted">
              {resumo.texto}
            </span>

            {(resumo.temAnterior || resumo.temProxima) && (
              <div className="flex items-center gap-[10px]">
                <button
                  type="button"
                  onClick={() => andar(-1)}
                  disabled={!resumo.temAnterior || notas.isFetching}
                  className={CLASSE_PAGINADOR}
                >
                  Anteriores
                </button>
                <button
                  type="button"
                  onClick={() => andar(1)}
                  disabled={!resumo.temProxima || notas.isFetching}
                  className={CLASSE_PAGINADOR}
                >
                  Próximas
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
