"use client";

import { useState } from "react";

import { useGruposDeDespesa } from "@/features/admin/hooks/useNotas";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";

import { paraDataLocal } from "../comprovantes-da-tela";
import {
  useConfirmarComprovante,
  useDescartarComprovante,
  useEditarComprovante,
} from "../hooks/useComprovantes";
import { urlDoArquivo, type Comprovante } from "../services/comprovantes";

const CAMPO =
  "w-full rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] outline-none focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";
const BOTAO =
  "rounded-[10px] px-[16px] py-[10px] text-[14px] font-semibold transition disabled:opacity-40";

/** O arquivo de um lado, os campos do outro: conferir olhando. */
export function DetalheDoComprovante({
  comprovante,
  onFechar,
}: {
  comprovante: Comprovante;
  onFechar: () => void;
}) {
  const lojas = useLojasDoPainel();
  const grupos = useGruposDeDespesa();
  const editar = useEditarComprovante();
  const confirmar = useConfirmarComprovante();
  const descartar = useDescartarComprovante();

  const [valor, setValor] = useState(comprovante.valor ?? "");
  const [dataHora, setDataHora] = useState(paraDataLocal(comprovante.data_hora));
  const [recebedor, setRecebedor] = useState(comprovante.recebedor_nome);
  const [loja, setLoja] = useState(comprovante.loja ?? "");
  const [elemento, setElemento] = useState(comprovante.elemento ?? "");

  const ocupado = editar.isPending || confirmar.isPending || descartar.isPending;
  const erro = editar.error ?? confirmar.error ?? descartar.error;

  const salvar = async () => {
    await editar.mutateAsync({
      id: comprovante.id,
      edicao: {
        valor: valor || undefined,
        // datetime-local não tem fuso: o "-03:00" diz que é horário de São Paulo.
        data_hora: dataHora ? `${dataHora}:00-03:00` : undefined,
        recebedor_nome: recebedor,
        loja: loja || null,
        elemento: elemento || null,
      },
    });
  };

  const salvarEConfirmar = async () => {
    await salvar();
    await confirmar.mutateAsync(comprovante.id);
    onFechar();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comprovante"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
    >
      <div className="flex max-h-[95vh] w-full max-w-[1100px] flex-col overflow-auto rounded-t-[16px] bg-caixa-surface md:flex-row md:rounded-[16px]">
        <div className="min-h-[300px] flex-1 bg-zinc-100">
          {comprovante.tem_arquivo ? (
            comprovante.arquivo_tipo === "application/pdf" ? (
              <iframe
                title="Arquivo do comprovante"
                src={urlDoArquivo(comprovante.id)}
                className="h-[60vh] w-full md:h-full"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlDoArquivo(comprovante.id)}
                alt="Arquivo do comprovante"
                className="mx-auto max-h-[60vh] object-contain md:max-h-[85vh]"
              />
            )
          ) : (
            <p className="p-[24px] text-[14px] text-caixa-muted">Sem arquivo guardado.</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-[12px] p-[20px] md:w-[380px]">
          <div className="flex items-start justify-between gap-[12px]">
            <h2 className="text-[18px] font-bold">Comprovante</h2>
            <button type="button" onClick={onFechar} className="text-[14px] text-caixa-muted">
              Fechar
            </button>
          </div>

          {comprovante.motivo && (
            <p className="rounded-[10px] bg-amber-50 p-[10px] text-[13px] text-amber-900">
              {comprovante.motivo}
            </p>
          )}

          <label className="flex flex-col gap-[4px] text-[13px]">
            Valor (R$)
            <input className={CAMPO} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(",", "."))} />
          </label>
          <label className="flex flex-col gap-[4px] text-[13px]">
            Data e hora
            <input className={CAMPO} type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
          </label>
          <label className="flex flex-col gap-[4px] text-[13px]">
            Para quem
            <input className={CAMPO} value={recebedor} onChange={(e) => setRecebedor(e.target.value)} />
          </label>
          <label className="flex flex-col gap-[4px] text-[13px]">
            Loja
            <select className={CAMPO} value={loja} onChange={(e) => setLoja(e.target.value)}>
              <option value="">Sem loja</option>
              {(lojas.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome_loja}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-[4px] text-[13px]">
            Categoria
            <select className={CAMPO} value={elemento} onChange={(e) => setElemento(e.target.value)}>
              <option value="">Sem categoria</option>
              {(grupos.data ?? []).map((grupo) => (
                <optgroup key={grupo.id} label={grupo.nome}>
                  {grupo.elementos.filter((item) => item.ativo).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {comprovante.pagador_nome && (
            <p className="text-[12px] text-caixa-muted">
              Pago por {comprovante.pagador_nome}
              {comprovante.pagador_banco ? ` · ${comprovante.pagador_banco}` : ""}
            </p>
          )}

          {erro && <p className="text-[13px] text-red-700">{(erro as Error).message}</p>}

          <div className="mt-auto flex flex-wrap gap-[8px] pt-[8px]">
            {comprovante.situacao === "CONFERIR" ? (
              <button type="button" disabled={ocupado} onClick={salvarEConfirmar} className={`${BOTAO} bg-caixa-accent text-white`}>
                Confirmar
              </button>
            ) : (
              <button type="button" disabled={ocupado} onClick={async () => { await salvar(); onFechar(); }} className={`${BOTAO} bg-caixa-accent text-white`}>
                Salvar
              </button>
            )}
            {comprovante.situacao !== "DESCARTADO" && (
              <button
                type="button"
                disabled={ocupado}
                onClick={async () => { await descartar.mutateAsync(comprovante.id); onFechar(); }}
                className={`${BOTAO} border border-caixa-border text-caixa-ink`}
              >
                Descartar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
