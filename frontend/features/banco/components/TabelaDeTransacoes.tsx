"use client";

import { useGruposDeDespesa } from "@/features/admin/hooks/useNotas";

import { classificacaoDoValor, linhaDaTabela, opcoesDaLinha } from "../banco-da-tela";
import { useCategoriasDeMovimento, useClassificarTransacao } from "../hooks/useBanco";
import type { TransacaoBancaria } from "../services/banco";

/**
 * As movimentações do extrato, com a classificação na própria linha.
 *
 * Um <select> por linha que salva sozinho, como a tela de notas: o trabalho é
 * passar por dezenas de linhas seguidas, e abrir uma tela por linha seria o
 * trabalho inteiro. Data, valor e descrição aparecem sem campo — vieram do
 * banco, e o arquivo original está guardado.
 */
export function TabelaDeTransacoes({
  transacoes,
  carregando,
  aplicarAsIguais,
}: {
  transacoes: TransacaoBancaria[];
  carregando: boolean;
  aplicarAsIguais: boolean;
}) {
  const plano = useGruposDeDespesa();
  const categorias = useCategoriasDeMovimento();
  const classificar = useClassificarTransacao();

  // Sem as listas de opções o seletor não sabe o que oferecer, e o valor da
  // linha classificada cairia no branco: um clique ali apagaria a
  // classificação certa. Enquanto elas não chegam, nada se troca.
  const opcoesProntas = plano.isSuccess && categorias.isSuccess;
  const opcoesFalharam = plano.isError || categorias.isError;

  return (
    <div className="cartao-caixa overflow-hidden rounded-[12px] border border-caixa-border bg-caixa-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <colgroup>
            <col className="w-[120px]" />
            <col />
            <col className="w-[210px]" />
            <col className="w-[150px]" />
            <col className="w-[280px]" />
          </colgroup>
          <thead>
            <tr className="h-[47px] bg-caixa-faixa text-[11px] font-semibold tracking-[0.5px] text-caixa-muted">
              <th className="pl-[24px] font-semibold">DATA</th>
              <th className="font-semibold">DESCRIÇÃO</th>
              <th className="font-semibold">LOJA E CONTA</th>
              <th className="text-right font-semibold">VALOR</th>
              <th className="pl-[24px] pr-[24px] font-semibold">O QUE É</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr className="h-[61px] border-t border-caixa-border">
                <td colSpan={5} className="pl-[24px] text-[15px] text-caixa-muted">
                  Carregando movimentações...
                </td>
              </tr>
            )}

            {!carregando && transacoes.length === 0 && (
              <tr className="border-t border-caixa-border">
                <td
                  colSpan={5}
                  className="px-[24px] py-[22px] text-[15px] leading-[1.5] text-caixa-muted"
                >
                  Nenhuma movimentação por aqui. Suba o extrato acima, ou tire o filtro para
                  ver as que já foram classificadas.
                </td>
              </tr>
            )}

            {!carregando &&
              transacoes.map((transacao) => {
                const linha = linhaDaTabela(transacao);
                const salvando =
                  classificar.isPending && classificar.variables?.id === linha.id;
                const grupos = opcoesProntas
                  ? opcoesDaLinha(transacao, plano.data, categorias.data)
                  : [];

                return (
                  <tr key={linha.id} className="border-t border-caixa-border align-middle">
                    <td className="py-[12px] pl-[24px] text-[15px] whitespace-nowrap tabular-nums">
                      {linha.data}
                    </td>
                    <td className="py-[12px] pr-[16px] text-[15px] leading-[1.35]">
                      {linha.descricao}
                      {linha.par && (
                        <span className="mt-[2px] block text-[13px] text-caixa-accent">
                          {linha.par}
                        </span>
                      )}
                    </td>
                    <td className="py-[12px] pr-[12px] text-[14px] leading-[1.35] text-caixa-muted">
                      {linha.lugar}
                    </td>
                    <td
                      className={`py-[12px] text-right text-[15px] font-semibold whitespace-nowrap tabular-nums ${
                        linha.entrada ? "text-caixa-accent" : ""
                      }`}
                    >
                      {linha.valor}
                    </td>
                    <td className="py-[10px] pl-[24px] pr-[24px]">
                      <select
                        aria-label={`O que é — ${linha.descricao}, ${linha.data}, ${linha.valor}`}
                        value={linha.classificacao}
                        disabled={salvando || !opcoesProntas}
                        onChange={(evento) =>
                          classificar.mutate({
                            id: linha.id,
                            classificacao: {
                              ...classificacaoDoValor(evento.target.value),
                              aplicar_as_iguais: aplicarAsIguais,
                            },
                          })
                        }
                        className={`w-full rounded-[10px] border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15 disabled:opacity-50 ${
                          linha.classificacao
                            ? "border-caixa-border"
                            : "border-caixa-warn/45 bg-caixa-warn-soft"
                        }`}
                      >
                        {opcoesProntas ? (
                          <option value="">Ainda não classificada</option>
                        ) : (
                          <option value={linha.classificacao}>
                            {opcoesFalharam
                              ? "Não foi possível carregar as opções"
                              : transacao.elemento?.nome ??
                                transacao.categoria?.nome ??
                                "Carregando as opções..."}
                          </option>
                        )}
                        {grupos.map((grupo) => (
                          <optgroup key={grupo.rotulo} label={grupo.rotulo}>
                            {grupo.opcoes.map((opcao) => (
                              <option key={opcao.valor} value={opcao.valor}>
                                {opcao.nome}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {opcoesFalharam && (
        <p className="border-t border-caixa-border px-[24px] py-[14px] text-[14px] font-medium text-caixa-alerta">
          Não foi possível carregar as categorias, então as movimentações não podem ser
          classificadas agora. As que já estavam classificadas continuam como estão.
        </p>
      )}

      {classificar.error && (
        <p className="border-t border-caixa-border px-[24px] py-[14px] text-[14px] font-medium text-caixa-alerta">
          {classificar.error instanceof Error
            ? classificar.error.message
            : "Não foi possível salvar a classificação."}
        </p>
      )}
    </div>
  );
}
