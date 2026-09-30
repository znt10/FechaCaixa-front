"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import {
  frasesDaImportacao,
  nomeDaConta,
  periodoDaImportacao,
  separarOsOfx,
} from "../banco-da-tela";
import { useContasBancarias, useImportarExtrato } from "../hooks/useBanco";
import type { ExtratoImportado, ExtratoRecusado } from "../services/banco";

const CLASSE_CAMPO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

/**
 * A subida do extrato de uma conta.
 *
 * A conta vem antes do arquivo, e não é deduzida dele: o OFX nem sempre diz a
 * conta de um jeito que case com o cadastro, e o servidor ainda confere e
 * recusa o extrato subido na conta errada — o erro mais provável de quem
 * baixa os extratos das oito lojas de uma vez.
 *
 * O resultado fica na tela até a próxima subida, como nas notas: "41 já
 * existiam" é a resposta à pergunta que todo mundo faz ao subir o mês de novo.
 */
export function UploadDeExtrato() {
  const contas = useContasBancarias();
  const importar = useImportarExtrato();
  const campoRef = useRef<HTMLInputElement>(null);
  const [contaEscolhida, setContaEscolhida] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [importados, setImportados] = useState<ExtratoImportado[]>([]);
  const [recusados, setRecusados] = useState<ExtratoRecusado[]>([]);

  const ativas = (contas.data ?? []).filter((conta) => conta.ativo);
  const semConta = !contaEscolhida;

  const enviar = (lista: FileList | null) => {
    if (!lista?.length || semConta) return;
    setImportados([]);
    setRecusados([]);

    const { ofx, descartados } = separarOsOfx(Array.from(lista));
    if (ofx.length === 0) {
      setRecusados(descartados);
      return;
    }

    importar.mutate(
      { contaBancaria: contaEscolhida, arquivos: ofx },
      {
        onSuccess: (resposta) => {
          setImportados(resposta.importados);
          setRecusados([...descartados, ...resposta.recusados]);
        },
        onError: () => setRecusados(descartados),
      },
    );
  };

  if (contas.isSuccess && ativas.length === 0) {
    return (
      <section className="cartao-caixa rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px]">
        <p className="text-[15px] leading-[1.5]">
          Nenhuma conta bancária cadastrada ainda.{" "}
          <Link href="/contas-bancarias" className="font-semibold text-caixa-accent underline">
            Cadastre a conta de cada loja
          </Link>{" "}
          para poder subir o extrato dela.
        </p>
      </section>
    );
  }

  return (
    <section className="cartao-caixa rounded-[12px] border border-caixa-border bg-caixa-surface">
      <div className="flex flex-col gap-[14px] px-[16px] py-[18px] md:px-[24px] md:py-[22px]">
        <label className="flex flex-col gap-[6px] text-[14px] font-medium md:max-w-[420px]">
          De qual conta é o extrato?
          <select
            value={contaEscolhida}
            onChange={(evento) => setContaEscolhida(evento.target.value)}
            className={CLASSE_CAMPO}
          >
            <option value="">Escolha a conta</option>
            {ativas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.loja.nome_loja} · {nomeDaConta(conta)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => campoRef.current?.click()}
          onDragOver={(evento) => {
            evento.preventDefault();
            if (!semConta) setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(evento) => {
            evento.preventDefault();
            setArrastando(false);
            enviar(evento.dataTransfer.files);
          }}
          disabled={importar.isPending || semConta}
          className={`flex w-full flex-col items-center gap-[6px] rounded-[12px] border border-dashed px-[20px] py-[24px] text-center transition disabled:opacity-60 ${
            arrastando
              ? "border-caixa-accent bg-caixa-accent-soft"
              : "border-caixa-accent/50 bg-caixa-faixa hover:border-caixa-accent"
          }`}
        >
          <span className="text-[16px] font-semibold leading-[1.25] text-caixa-accent">
            {importar.isPending
              ? "Lendo o extrato..."
              : semConta
                ? "Escolha a conta acima primeiro"
                : "Solte aqui o extrato em OFX"}
          </span>
          <span className="text-[14px] leading-[1.4] text-caixa-muted">
            Pode subir o mês inteiro de novo: o que já entrou não se repete.
          </span>
        </button>

        <input
          ref={campoRef}
          type="file"
          accept=".ofx"
          multiple
          hidden
          onChange={(evento) => {
            enviar(evento.target.files);
            evento.target.value = "";
          }}
        />

        {importar.error && (
          <p className="rounded-[10px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[16px] py-[12px] text-[14px] font-medium text-caixa-alerta">
            {importar.error instanceof Error
              ? importar.error.message
              : "Não foi possível enviar o extrato. Tente de novo."}
          </p>
        )}

        {importados.length > 0 && !importar.isPending && (
          <ul aria-live="polite" className="flex flex-col gap-[6px]">
            {importados.map((importado) => {
              const periodo = periodoDaImportacao(importado);
              return (
                <li key={importado.arquivo} className="text-[15px] leading-[1.45]">
                  <span className="font-semibold break-all">{importado.arquivo}</span>
                  {periodo && <span className="text-caixa-muted"> ({periodo})</span>}:{" "}
                  {frasesDaImportacao(importado).join(" · ")}.
                </li>
              );
            })}
          </ul>
        )}

        {recusados.length > 0 && (
          <ul className="flex flex-col gap-[8px] rounded-[10px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[16px] py-[14px]">
            {recusados.map((recusado, indice) => (
              <li key={`${recusado.arquivo}-${indice}`} className="flex flex-col gap-[2px]">
                <span className="text-[13px] break-all text-caixa-ink">{recusado.arquivo}</span>
                <span className="text-[14px] font-semibold leading-[1.35] text-caixa-alerta">
                  {recusado.motivo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
