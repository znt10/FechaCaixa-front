"use client";

import { useMemo, useState } from "react";

import {
  andarDePagina,
  ESCOLHAS_INICIAIS,
  filtroDoResumo,
  montarFiltroDoExtrato,
  nomeDaConta,
  resumoDaPagina,
  trocarDeFiltro,
  type EscolhasDoExtrato,
} from "@/features/banco/banco-da-tela";
import { ResumoDoExtrato } from "@/features/banco/components/ResumoDoExtrato";
import { TabelaDeTransacoes } from "@/features/banco/components/TabelaDeTransacoes";
import { UploadDeExtrato } from "@/features/banco/components/UploadDeExtrato";
import {
  useContasBancarias,
  useResumoDoExtrato,
  useTransacoes,
} from "@/features/banco/hooks/useBanco";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";

const CLASSE_FILTRO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

const CLASSE_PAGINADOR =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[9px] text-[14px] font-semibold text-caixa-ink transition hover:border-caixa-accent/40 disabled:opacity-40 disabled:hover:border-caixa-border";

/**
 * Extrato bancário.
 *
 * As telas do caixa contam o que a loja lançou; esta conta o que passou pelo
 * banco de cada loja. A gerência sobe o OFX de cada conta e diz o que é cada
 * linha: pagamento, transferência ou recebimento. O que o sistema já sabe —
 * transferência entre lojas, descrição que já foi respondida — chega pronto.
 */
export default function ExtratoPage() {
  const [escolhas, setEscolhas] = useState<EscolhasDoExtrato>(ESCOLHAS_INICIAIS);
  // Ligado de saída: quem classifica "PIX RECEBIDO" uma vez quase sempre quer
  // as outras vinte iguais do mês junto. Desliga quem estiver separando caso a
  // caso.
  const [aplicarAsIguais, setAplicarAsIguais] = useState(true);
  const lojas = useLojasDoPainel();
  const contas = useContasBancarias();

  const filtro = useMemo(() => montarFiltroDoExtrato(escolhas), [escolhas]);
  const recorte = useMemo(() => filtroDoResumo(escolhas), [escolhas]);
  const transacoes = useTransacoes(filtro);
  const resumo = useResumoDoExtrato(recorte);

  const escolher = (mudanca: Partial<EscolhasDoExtrato>) =>
    setEscolhas((atual) => trocarDeFiltro(atual, mudanca));

  const contasDaLoja = (contas.data ?? []).filter(
    (conta) => !escolhas.loja || conta.loja.id === escolhas.loja,
  );
  const pagina = transacoes.data ? resumoDaPagina(transacoes.data, escolhas.pagina) : null;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] md:px-[40px] pb-[60px]">
      <div className="flex flex-col gap-[2px] py-[28px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Extrato</h1>
        <p className="text-[14px] leading-[1.4] text-caixa-muted">
          Suba o extrato de cada conta e diga o que é cada movimentação.
        </p>
      </div>

      <div className="flex flex-col gap-[20px]">
        <UploadDeExtrato />

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
            // Trocar a loja limpa a conta: a conta de outra loja deixaria a
            // lista vazia sem motivo aparente.
            onChange={(evento) => escolher({ loja: evento.target.value, contaBancaria: "" })}
            className={CLASSE_FILTRO}
          >
            <option value="">Todas as lojas</option>
            {(lojas.data ?? []).map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome_loja}
              </option>
            ))}
          </select>

          <select
            aria-label="Conta"
            value={escolhas.contaBancaria}
            onChange={(evento) => escolher({ contaBancaria: evento.target.value })}
            className={CLASSE_FILTRO}
          >
            <option value="">Todas as contas</option>
            {contasDaLoja.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {escolhas.loja ? "" : `${conta.loja.nome_loja} · `}
                {nomeDaConta(conta)}
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

        {/* Nada de resumo enquanto ele falhou: o dinheiro de um filtro em cima
            da tabela de outro é pior do que número nenhum. */}
        {resumo.data && !resumo.error && <ResumoDoExtrato resumo={resumo.data} />}

        {transacoes.error && (
          <div className="flex flex-wrap items-center justify-between gap-[12px] rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[20px] py-[16px]">
            <p className="text-[14px] font-medium text-caixa-alerta">
              {transacoes.error instanceof Error
                ? transacoes.error.message
                : "Não foi possível carregar o extrato."}
              {escolhas.pagina > 1 &&
                " A lista pode ter mudado e esta página deixado de existir."}
            </p>
            {escolhas.pagina > 1 && (
              <button
                type="button"
                onClick={() => setEscolhas((atual) => ({ ...atual, pagina: 1 }))}
                className={CLASSE_PAGINADOR}
              >
                Voltar para a primeira página
              </button>
            )}
          </div>
        )}

        <label className="flex items-center gap-[8px] text-[14px] leading-[1.4] text-caixa-muted">
          <input
            type="checkbox"
            checked={aplicarAsIguais}
            onChange={(evento) => setAplicarAsIguais(evento.target.checked)}
            className="h-[16px] w-[16px] accent-caixa-accent"
          />
          Ao classificar, aplicar a mesma escolha às outras pendentes com a mesma descrição
        </label>

        <TabelaDeTransacoes
          transacoes={transacoes.data?.results ?? []}
          carregando={transacoes.isPending}
          aplicarAsIguais={aplicarAsIguais}
        />

        {pagina && (pagina.texto || pagina.temAnterior || pagina.temProxima) && (
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <span aria-live="polite" className="text-[14px] text-caixa-muted">
              {pagina.texto}
            </span>
            {(pagina.temAnterior || pagina.temProxima) && (
              <div className="flex items-center gap-[10px]">
                <button
                  type="button"
                  onClick={() => setEscolhas((atual) => andarDePagina(atual, -1))}
                  disabled={!pagina.temAnterior || transacoes.isFetching}
                  className={CLASSE_PAGINADOR}
                >
                  Anteriores
                </button>
                <button
                  type="button"
                  onClick={() => setEscolhas((atual) => andarDePagina(atual, 1))}
                  disabled={!pagina.temProxima || transacoes.isFetching}
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
