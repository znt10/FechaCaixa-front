import { emReais } from "@/features/fechamento/painel-dados";

import { rotuloDaSituacao } from "../comprovantes-da-tela";
import type { Comprovante } from "../services/comprovantes";

const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

const COR: Record<Comprovante["situacao"], string> = {
  OK: "bg-emerald-100 text-emerald-900",
  CONFERIR: "bg-amber-100 text-amber-900",
  DESCARTADO: "bg-zinc-200 text-zinc-700",
};

const COLUNAS = "md:grid-cols-[110px_1fr_160px_160px_110px_100px]";

/** Tabela no desktop, cartões no celular: a mesma lista, um clique abre o
 *  detalhe. Mora dentro do cartão dos filtros, como a tabela do fechamento. */
export function ListaDeComprovantes({
  comprovantes,
  onAbrir,
}: {
  comprovantes: Comprovante[];
  onAbrir: (comprovante: Comprovante) => void;
}) {
  if (comprovantes.length === 0) {
    return (
      <p className="py-[40px] text-center text-[14px] text-caixa-muted">
        Nenhum comprovante neste filtro.
      </p>
    );
  }
  return (
    <>
    <div
      aria-hidden="true"
      className={`hidden h-[47px] items-center gap-x-[12px] bg-caixa-faixa px-[16px] text-[11px] md:px-[24px] font-semibold tracking-[0.5px] text-caixa-muted md:grid ${COLUNAS}`}
    >
      <span>DATA</span>
      <span>VALOR</span>
      <span>PARA QUEM</span>
      <span>LOJA</span>
      <span>CATEGORIA</span>
      <span>SITUAÇÃO</span>
    </div>
    <ul className="flex flex-col divide-y divide-caixa-border">
      {comprovantes.map((comprovante) => (
        <li key={comprovante.id}>
          <button
            type="button"
            onClick={() => onAbrir(comprovante)}
            className={`grid w-full grid-cols-[1fr_auto] gap-x-[12px] gap-y-[4px] px-[16px] py-[12px] text-left text-[14px] transition md:px-[24px] hover:bg-caixa-accent/5 md:items-center ${COLUNAS}`}
          >
            <span className="text-caixa-muted md:order-none">{data(comprovante.data_hora)}</span>
            <span className="font-semibold md:order-none">
              {comprovante.valor ? `R$ ${emReais(Number(comprovante.valor))}` : "Sem valor"}
            </span>
            <span className="col-span-2 truncate md:col-span-1">
              {comprovante.recebedor_nome || comprovante.arquivo_nome || "Sem recebedor"}
            </span>
            <span className="truncate text-caixa-muted">{comprovante.loja_nome ?? "Sem loja"}</span>
            <span className="truncate text-caixa-muted">
              {comprovante.elemento_nome ?? "Sem categoria"}
            </span>
            <span className={`w-fit rounded-[8px] px-[8px] py-[2px] text-[12px] font-semibold ${COR[comprovante.situacao]}`}>
              {rotuloDaSituacao(comprovante.situacao)}
            </span>
          </button>
        </li>
      ))}
    </ul>
    </>
  );
}
