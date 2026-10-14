import { emReais } from "@/features/fechamento/painel-dados";

import { linhasDoResumo } from "../comprovantes-da-tela";
import type { TotaisDeComprovantes } from "../services/comprovantes";

/** O total no mesmo cartão do fechamento de caixa: rótulo pequeno, valor
 *  grande, e à direita o que se divide dele por loja. */
export function ResumoDosComprovantes({
  rotulo,
  totais,
}: {
  rotulo: string;
  totais: TotaisDeComprovantes;
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

        {linhas.length > 0 && (
          <div className="flex w-full flex-col gap-[8px] md:w-[300px] md:border-l md:border-caixa-accent/20 md:pl-[28px]">
            {linhas.map((linha) => (
              <div key={linha.nome} className="flex justify-between gap-[8px] text-[14px]">
                <span>{linha.nome}</span>
                <span className="font-semibold tabular-nums">R$ {emReais(Number(linha.valor))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
