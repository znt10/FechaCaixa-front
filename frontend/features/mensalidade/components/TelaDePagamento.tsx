import type { MinhaMensalidade } from "../services/mensalidade";
import { QuadroDoPix } from "./QuadroDoPix";

/** O que o painel mostra no lugar do conteúdo quando a empresa está bloqueada. */
export function TelaDePagamento({ mensalidade }: { mensalidade: MinhaMensalidade }) {
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-[16px] px-[16px] py-[40px]">
      <h1 className="text-[22px] font-bold leading-[1.2]">
        A mensalidade desta empresa está atrasada
      </h1>
      <p className="text-[15px] leading-[1.5] text-caixa-muted">
        O painel volta assim que o pagamento for confirmado. As lojas continuam lançando o
        caixa normalmente.
      </p>
      <QuadroDoPix mensalidade={mensalidade} />
    </main>
  );
}
