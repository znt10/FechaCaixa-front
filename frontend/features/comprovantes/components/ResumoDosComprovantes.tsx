import { emReais } from "@/features/fechamento/painel-dados";

import { linhasDoResumo } from "../comprovantes-da-tela";
import type { TotaisDeComprovantes } from "../services/comprovantes";

export function ResumoDosComprovantes({
  totais,
  onVerConferir,
}: {
  totais: TotaisDeComprovantes;
  onVerConferir: () => void;
}) {
  const linhas = linhasDoResumo(totais);
  return (
    <section className="flex flex-col gap-[12px] rounded-[14px] border border-caixa-border bg-caixa-surface p-[16px] md:p-[20px]">
      <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
        <div>
          <p className="text-[13px] text-caixa-muted">Total do período</p>
          <p className="text-[26px] font-bold leading-[1.2]">R$ {emReais(Number(totais.valor))}</p>
        </div>
        {totais.conferir > 0 && (
          <button
            type="button"
            onClick={onVerConferir}
            className="rounded-[10px] bg-amber-100 px-[14px] py-[8px] text-[14px] font-semibold text-amber-900"
          >
            {totais.conferir} para conferir
          </button>
        )}
      </div>
      {linhas.length > 0 && (
        <ul className="grid gap-[6px] sm:grid-cols-2 lg:grid-cols-4">
          {linhas.map((linha) => (
            <li key={linha.nome} className="flex justify-between gap-[8px] text-[14px]">
              <span className="text-caixa-muted">{linha.nome}</span>
              <span className="font-semibold">R$ {emReais(Number(linha.valor))}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
