"use client";

import { linhasDaTabela, seletorDaLinha } from "../notas-da-tela";
import { useClassificarNota, useGruposDeDespesa } from "../hooks/useNotas";
import type { NotaFiscal } from "../services/notas";

/**
 * As notas importadas, com a classificação editável na própria linha.
 *
 * O trabalho real de quem usa isto é passar por dezenas de notas escolhendo o
 * elemento de uma atrás da outra; abrir e fechar uma tela por nota seria a
 * tarefa inteira. Por isso o <select> fica na linha e salva sozinho.
 *
 * Número, série, data e valor aparecem, mas não têm campo: são a prova da
 * despesa, tirados do XML guardado. Corrigi-los aqui faria o relatório
 * divergir do arquivo que o fisco enxerga.
 */
export function TabelaDeNotas({
  notas,
  carregando,
}: {
  notas: NotaFiscal[];
  carregando: boolean;
}) {
  const plano = useGruposDeDespesa();
  const classificar = useClassificarNota();
  const linhas = linhasDaTabela(notas);

  // O plano de contas fora do ar não pode virar uma classificação apagada: sem
  // ele o seletor não sabe o que oferecer, então ele para de aceitar troca em
  // vez de oferecer o branco como se fosse o estado da nota.
  const estadoDoPlano = plano.isError
    ? "falhou"
    : plano.isSuccess
      ? "pronto"
      : "carregando";

  return (
    <div className="cartao-caixa overflow-hidden rounded-[12px] border border-caixa-border bg-caixa-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[150px]" />
            <col />
            <col className="w-[160px]" />
            <col className="w-[140px]" />
            <col className="w-[260px]" />
          </colgroup>
          <thead>
            <tr className="h-[47px] bg-caixa-faixa text-[11px] font-semibold tracking-[0.5px] text-caixa-muted">
              <th className="pl-[24px] font-semibold">DATA</th>
              <th className="font-semibold">NOTA</th>
              <th className="font-semibold">FORNECEDOR</th>
              <th className="font-semibold">LOJA</th>
              <th className="text-right font-semibold">VALOR</th>
              <th className="pl-[24px] pr-[24px] font-semibold">GASTO COM</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr className="h-[61px] border-t border-caixa-border">
                <td colSpan={6} className="pl-[24px] text-[15px] text-caixa-muted">
                  Carregando notas...
                </td>
              </tr>
            )}

            {!carregando && linhas.length === 0 && (
              <tr className="border-t border-caixa-border">
                <td
                  colSpan={6}
                  className="px-[24px] py-[22px] text-[15px] leading-[1.5] text-caixa-muted"
                >
                  Nenhuma nota por aqui. Suba os XMLs do mês acima, ou tire o
                  filtro para ver as que já foram classificadas.
                </td>
              </tr>
            )}

            {!carregando &&
              linhas.map((linha) => {
                const salvando =
                  classificar.isPending && classificar.variables?.id === linha.id;
                const seletor = seletorDaLinha(estadoDoPlano, plano.data ?? [], linha);

                return (
                  <tr
                    key={linha.id}
                    className="h-[61px] border-t border-caixa-border align-middle"
                  >
                    <td className="pl-[24px] text-[15px] whitespace-nowrap tabular-nums">
                      {linha.data}
                    </td>
                    <td className="text-[14px] whitespace-nowrap text-caixa-muted">
                      {linha.documento}
                    </td>
                    <td className="pr-[16px] text-[15px] leading-[1.35]">
                      {linha.fornecedor}
                    </td>
                    <td className="text-[15px]">{linha.loja}</td>
                    <td className="text-right text-[15px] font-semibold whitespace-nowrap tabular-nums">
                      {linha.valor}
                    </td>
                    <td className="py-[10px] pl-[24px] pr-[24px]">
                      <select
                        aria-label={`Gasto com — nota ${linha.documento} de ${linha.fornecedor}`}
                        value={linha.elementoId}
                        disabled={salvando || seletor.desabilitado}
                        onChange={(evento) =>
                          classificar.mutate({
                            id: linha.id,
                            elementoId: evento.target.value || null,
                          })
                        }
                        className={`w-full rounded-[10px] border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15 disabled:opacity-50 ${
                          linha.elementoId
                            ? "border-caixa-border"
                            : "border-caixa-warn/45 bg-caixa-warn-soft"
                        }`}
                      >
                        {/* Sem classificação continua na lista: a gerência
                            precisa poder desfazer a escolha errada, e não só
                            trocá-la por outra. Ela sai quando o plano de contas
                            não carregou — ali o branco não é o estado da nota,
                            é a falha se passando por ele. */}
                        {seletor.vazio !== null && (
                          <option value="">{seletor.vazio}</option>
                        )}
                        {seletor.atual && (
                          <option value={seletor.atual.id}>{seletor.atual.nome}</option>
                        )}
                        {/* Só o que está ativo, mais o que já está lançado
                            nesta nota: classificar numa linha que a gerência
                            desativou é lançar a despesa onde ninguém mais
                            olha. */}
                        {seletor.grupos.map((grupo) => (
                          <optgroup key={grupo.id} label={grupo.nome}>
                            {grupo.elementos.map((elemento) => (
                              <option key={elemento.id} value={elemento.id}>
                                {elemento.nome}
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

      {plano.isError && (
        <p className="border-t border-caixa-border px-[24px] py-[14px] text-[14px] font-medium text-caixa-alerta">
          Não foi possível carregar o plano de contas, então as notas não podem
          ser classificadas agora. As que já estavam classificadas continuam
          como estão. Tente de novo daqui a pouco.
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
