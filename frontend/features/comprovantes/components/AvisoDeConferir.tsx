import { avisoDeConferir } from "../comprovantes-da-tela";

/** O mesmo alerta do fechamento de caixa ("1 loja ainda não lançou"): em cima
 *  do total, porque o que está em conferir ainda não soma nele. */
export function AvisoDeConferir({
  quantos,
  onVer,
}: {
  quantos: number;
  /** Ausente quando a lista já mostra só os de conferir. */
  onVer?: () => void;
}) {
  return (
    <div className="cartao-caixa flex items-start gap-[16px] rounded-[12px] border border-caixa-alerta/35 border-l-[6px] border-l-caixa-alerta bg-caixa-alerta-soft px-[16px] py-[18px] md:px-[24px] md:py-[20px]">
      <span className="mt-[6px] h-[12px] w-[12px] shrink-0 rounded-full bg-caixa-alerta" />
      <div className="flex flex-col gap-[8px]">
        <span className="text-[17px] font-bold leading-[1.3] text-caixa-alerta">
          {avisoDeConferir(quantos)}
        </span>
        <span className="text-[14px] text-caixa-alerta">Eles ainda não somam no total.</span>
        {onVer && (
          <button
            type="button"
            onClick={onVer}
            className="w-fit rounded-[8px] bg-caixa-surface px-[12px] py-[6px] text-[16px] font-semibold text-caixa-alerta"
          >
            Ver para conferir
          </button>
        )}
      </div>
    </div>
  );
}
