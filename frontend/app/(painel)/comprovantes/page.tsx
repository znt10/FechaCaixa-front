"use client";

import { useMemo, useState } from "react";

import {
  escolhasIniciais,
  montarFiltro,
  type EscolhasDosComprovantes,
} from "@/features/comprovantes/comprovantes-da-tela";
import { DetalheDoComprovante } from "@/features/comprovantes/components/DetalheDoComprovante";
import { EnviarComprovante } from "@/features/comprovantes/components/EnviarComprovante";
import { ListaDeComprovantes } from "@/features/comprovantes/components/ListaDeComprovantes";
import { ResumoDosComprovantes } from "@/features/comprovantes/components/ResumoDosComprovantes";
import { useComprovantes } from "@/features/comprovantes/hooks/useComprovantes";
import type { Comprovante } from "@/features/comprovantes/services/comprovantes";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";

const CLASSE_FILTRO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

/**
 * Comprovantes.
 *
 * O gasto sem nota: o que chegou por e-mail e o que foi enviado aqui. Só o
 * que está OK soma; "conferir" é a fila de quem precisa olhar.
 */
export default function ComprovantesPage() {
  const [escolhas, setEscolhas] = useState<EscolhasDosComprovantes>(() =>
    escolhasIniciais(new Date()),
  );
  const [aberto, setAberto] = useState<Comprovante | null>(null);
  const lojas = useLojasDoPainel();
  const filtro = useMemo(() => montarFiltro(escolhas), [escolhas]);
  const comprovantes = useComprovantes(filtro);

  // Trocar qualquer filtro volta para a página 1.
  const escolher = (mudanca: Partial<EscolhasDosComprovantes>) =>
    setEscolhas((atual) => ({ ...atual, pagina: 1, ...mudanca }));

  const dados = comprovantes.data;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <div className="flex flex-col gap-[12px] py-[28px] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[22px] font-bold leading-[1.2]">Comprovantes</h1>
          <p className="text-[14px] leading-[1.4] text-caixa-muted">
            O gasto sem nota: o que chega por e-mail e o que você envia aqui.
          </p>
        </div>
        <EnviarComprovante onLido={setAberto} />
      </div>

      <div className="flex flex-col gap-[20px]">
        {dados && (
          <ResumoDosComprovantes
            totais={dados.totais}
            onVerConferir={() => escolher({ situacao: "CONFERIR" })}
          />
        )}

        <div className="flex flex-wrap items-center gap-[12px]">
          <input aria-label="De" type="date" className={CLASSE_FILTRO} value={escolhas.de} onChange={(e) => escolher({ de: e.target.value })} />
          <input aria-label="Até" type="date" className={CLASSE_FILTRO} value={escolhas.ate} onChange={(e) => escolher({ ate: e.target.value })} />
          <select aria-label="Loja" className={CLASSE_FILTRO} value={escolhas.loja} onChange={(e) => escolher({ loja: e.target.value })}>
            <option value="">Todas as lojas</option>
            <option value="sem">Sem loja</option>
            {(lojas.data ?? []).map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome_loja}
              </option>
            ))}
          </select>
          <select
            aria-label="Situação"
            className={CLASSE_FILTRO}
            value={escolhas.situacao}
            onChange={(e) => escolher({ situacao: e.target.value as EscolhasDosComprovantes["situacao"] })}
          >
            <option value="">Todas as situações</option>
            <option value="OK">OK</option>
            <option value="CONFERIR">Conferir</option>
            <option value="DESCARTADO">Descartado</option>
          </select>
        </div>

        {comprovantes.isError ? (
          <p className="text-[14px] text-red-700">Não deu para carregar os comprovantes.</p>
        ) : !dados ? (
          <p className="text-[14px] text-caixa-muted">Carregando…</p>
        ) : (
          <>
            <ListaDeComprovantes comprovantes={dados.results} onAbrir={setAberto} />
            {(dados.previous || dados.next) && (
              <div className="flex justify-center gap-[8px]">
                <button type="button" disabled={!dados.previous} onClick={() => setEscolhas((a) => ({ ...a, pagina: a.pagina - 1 }))} className={CLASSE_FILTRO}>
                  Anteriores
                </button>
                <button type="button" disabled={!dados.next} onClick={() => setEscolhas((a) => ({ ...a, pagina: a.pagina + 1 }))} className={CLASSE_FILTRO}>
                  Próximas
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {aberto && (
        <DetalheDoComprovante key={aberto.id} comprovante={aberto} onFechar={() => setAberto(null)} />
      )}
    </main>
  );
}
