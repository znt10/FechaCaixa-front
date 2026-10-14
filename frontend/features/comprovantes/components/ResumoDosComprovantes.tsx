import { emReais } from "@/features/fechamento/painel-dados";

import { linhasDoResumo } from "../comprovantes-da-tela";
import type { TotaisDeComprovantes } from "../services/comprovantes";

/** O total no mesmo cartão do fechamento de caixa: rótulo pequeno, valor
 *  grande, e à direita o que se divide dele — por loja e o que falta conferir. */
export function ResumoDosComprovantes({
  rotulo,
  totais,
  onVerConferir,
}: {
  rotulo: string;
  totais: TotaisDeComprovantes;
  onVerConferir: () => void;
}) {
  const linhas = linhasDoResumo(totais);
  return (
    <section className="cartao-caixa rounded-[12px] bg-caixa-total px-[18px] py-[20px] text-caixa-accent md:px-[28px] md:py-[24px]">
      <div className="grid gap-[20px] md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex flex-col gap-[6px]">
          <span className="text-[12px] font-semibold uppercase tracking-[0.6px]">{rotulo}</span>
          <span className="text-[42px] font-bold leading-[1.05] tabular-nums">
            R$ {emReais(Number(totais.valor))}
          </span>
        </div>

        {(linhas.length > 0 || totais.conferir > 0) && (
          <div className="flex w-full flex-col gap-[8px] md:w-[300px] md:border-l md:border-caixa-accent/20 md:pl-[28px]">
            {linhas.map((linha) => (
              <div key={linha.nome} className="flex justify-between gap-[8px] text-[14px]">
                <span>{linha.nome}</span>
                <span className="font-semibold tabular-nums">R$ {emReais(Number(linha.valor))}</span>
              </div>
            ))}
            {totais.conferir > 0 && (
              <button
                type="button"
                onClick={onVerConferir}
                className="mt-[4px] w-fit rounded-[10px] bg-amber-100 px-[14px] py-[8px] text-[14px] font-semibold text-amber-900"
              >
                {totais.conferir} para conferir
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
