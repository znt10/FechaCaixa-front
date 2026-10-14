"use client";

import { useRef, useState } from "react";

import { resumoDoEnvio, type ResultadoDoEnvio } from "../comprovantes-da-tela";
import { useEnviarComprovante } from "../hooks/useComprovantes";
import type { Comprovante } from "../services/comprovantes";

/** Escolher o arquivo ou tirar a foto. Uma foto: lida na hora, e o detalhe
 *  abre preenchido (para escolher a loja: o papel da lotérica não diz).
 *  Várias de uma vez: lidas uma por uma, e no fim um resumo do que entrou —
 *  é o caminho de quem só tem as fotos, sem e-mail. */
export function EnviarComprovante({ onLido }: { onLido: (comprovante: Comprovante) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const enviar = useEnviarComprovante();
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const [resumo, setResumo] = useState<ReturnType<typeof resumoDoEnvio> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const escolher = async (lista: FileList | null) => {
    const arquivos = Array.from(lista ?? []);
    if (entrada.current) entrada.current.value = "";
    if (arquivos.length === 0) return;
    setResumo(null);
    setErro(null);

    if (arquivos.length === 1) {
      try {
        onLido(await enviar.mutateAsync({ arquivo: arquivos[0] }));
      } catch (falha) {
        setErro((falha as Error).message);
      }
      return;
    }

    // Uma por vez: a leitura de cada uma leva alguns segundos, e o contador
    // mostra que está andando.
    const resultados: ResultadoDoEnvio[] = [];
    for (const [indice, arquivo] of arquivos.entries()) {
      setProgresso({ atual: indice + 1, total: arquivos.length });
      try {
        const comprovante = await enviar.mutateAsync({ arquivo });
        resultados.push({ nome: arquivo.name, situacao: comprovante.situacao });
      } catch (falha) {
        resultados.push({ nome: arquivo.name, erro: (falha as Error).message });
      }
    }
    setProgresso(null);
    setResumo(resumoDoEnvio(resultados));
  };

  const ocupado = enviar.isPending || progresso !== null;

  return (
    <div className="flex flex-col gap-[6px]">
      <input
        ref={entrada}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(evento) => escolher(evento.target.files)}
      />
      <button
        type="button"
        disabled={ocupado}
        onClick={() => entrada.current?.click()}
        className="w-fit rounded-[10px] bg-caixa-accent px-[16px] py-[10px] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {progresso
          ? `Lendo ${progresso.atual} de ${progresso.total}…`
          : enviar.isPending
            ? "Lendo o comprovante…"
            : "Enviar comprovantes"}
      </button>
      <p className="text-[13px] text-caixa-muted">Dá para escolher várias fotos de uma vez.</p>
      {erro && <p className="text-[13px] text-red-700">{erro}</p>}
      {resumo && (
        <div className="flex max-w-[560px] flex-col gap-[6px] rounded-[10px] border border-caixa-border bg-caixa-surface px-[14px] py-[10px] text-[14px]">
          <div className="flex items-start justify-between gap-[12px]">
            <span className="font-semibold">{resumo.titulo}</span>
            <button
              type="button"
              onClick={() => setResumo(null)}
              className="text-[13px] text-caixa-muted hover:text-caixa-ink"
            >
              Fechar
            </button>
          </div>
          {resumo.recusados.map(({ nome, erro: motivo }, indice) => (
            // Pela posição: duas fotos do celular podem ter o mesmo nome.
            <p key={indice} className="text-[13px] text-red-700">
              {nome}: {motivo}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
