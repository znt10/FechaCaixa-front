"use client";

import { useRef, useState } from "react";

import {
  mensagemDeErroDoEnvio,
  resultadoDoLote,
  resumoDoLote,
  separarOsXmls,
  type GrupoDeRecusa,
} from "../notas-da-tela";
import { useImportarNotas } from "../hooks/useNotas";

/**
 * A subida das notas do mês.
 *
 * Aceita vários .xml de uma vez: quem baixa as notas do e-mail baixa o mês
 * inteiro, e uma por vez seriam cem cliques.
 *
 * O resultado do lote fica na tela até a próxima subida, e não num aviso que
 * some sozinho: a lista de recusadas é o que a gerência precisa ler com calma
 * para saber qual nota conferir. Uma importação que engole três recusas em
 * silêncio é pior que uma que falha inteira — a despesa não entrou, e ninguém
 * ficou sabendo.
 */
export function UploadDeNotas() {
  const importar = useImportarNotas();
  const campoRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [recusadas, setRecusadas] = useState<GrupoDeRecusa[]>([]);
  const [importadas, setImportadas] = useState<number | null>(null);

  const enviar = (lista: FileList | null) => {
    if (!lista?.length) return;

    // O resultado do lote anterior sai da tela antes de o novo começar: se
    // este envio falhar inteiro, a faixa vermelha do erro apareceria junto com
    // o "3 notas entraram" de ontem, e é o número velho que a gerência leria.
    setImportadas(null);
    setRecusadas([]);

    const { xmls, descartados } = separarOsXmls(Array.from(lista));

    if (xmls.length === 0) {
      setImportadas(0);
      setRecusadas(descartados);
      return;
    }

    importar.mutate(xmls, {
      onSuccess: (resposta) => {
        const resultado = resultadoDoLote(descartados, resposta);
        setImportadas(resultado.importadas);
        setRecusadas(resultado.recusadas);
      },
      // Os descartados foram separados ANTES de o envio sair da máquina, então
      // não dependem dele ter dado certo: sem isto, um envio que morre na rede
      // levava junto a única menção aos PDFs que a pessoa soltou na tela.
      onError: () => setRecusadas(descartados),
    });
  };

  const resumo = resumoDoLote(importadas ?? 0, recusadas);

  return (
    <section className="cartao-caixa rounded-[12px] border border-caixa-border bg-caixa-surface">
      <div className="px-[16px] py-[18px] md:px-[24px] md:py-[22px]">
        <button
          type="button"
          onClick={() => campoRef.current?.click()}
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(evento) => {
            evento.preventDefault();
            setArrastando(false);
            enviar(evento.dataTransfer.files);
          }}
          disabled={importar.isPending}
          className={`flex w-full flex-col items-center gap-[6px] rounded-[12px] border border-dashed px-[20px] py-[28px] text-center transition disabled:opacity-60 ${
            arrastando
              ? "border-caixa-accent bg-caixa-accent-soft"
              : "border-caixa-accent/50 bg-caixa-faixa hover:border-caixa-accent"
          }`}
        >
          <span className="text-[16px] font-semibold leading-[1.25] text-caixa-accent">
            {importar.isPending ? "Lendo as notas..." : "Solte aqui os XMLs das notas"}
          </span>
          <span className="text-[14px] leading-[1.4] text-caixa-muted">
            Pode soltar o mês inteiro de uma vez, ou clicar para escolher os
            arquivos.
          </span>
        </button>

        <input
          ref={campoRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          multiple
          hidden
          onChange={(evento) => {
            enviar(evento.target.files);
            // Zerado para que soltar o MESMO arquivo de novo (o caso de quem
            // corrigiu algo e reenviou) dispare o onChange outra vez.
            evento.target.value = "";
          }}
        />

        {importar.error && (
          <p className="mt-[16px] rounded-[10px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[16px] py-[12px] text-[14px] font-medium text-caixa-alerta">
            {mensagemDeErroDoEnvio(importar.error)}
          </p>
        )}

        {importadas !== null && !importar.isPending && (
          <p
            aria-live="polite"
            className="mt-[16px] text-[15px] leading-[1.4] text-caixa-ink"
          >
            <span className="font-semibold">{resumo.entraram}</span>
            {resumo.ficaramDeFora && ` — ${resumo.ficaramDeFora}.`}
          </p>
        )}

        {recusadas.length > 0 && (
          <div className="mt-[12px] flex flex-col gap-[12px] rounded-[10px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[16px] py-[14px]">
            {/* Por motivo, e não por arquivo: soltar o mês inteiro derruba
                dezenas de XMLs pela mesma causa, e uma linha para cada viraria
                uma parede que ninguem le. */}
            {recusadas.map((grupo) => (
              <div key={grupo.motivo} className="flex flex-col gap-[4px]">
                <span className="text-[14px] font-semibold leading-[1.35] text-caixa-alerta">
                  {grupo.motivo}
                </span>
                <ul className="flex flex-col gap-[2px]">
                  {grupo.arquivos.map((arquivo, indice) => (
                    <li
                      key={`${arquivo}-${indice}`}
                      className="text-[13px] leading-[1.4] break-all text-caixa-ink"
                    >
                      {arquivo}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
