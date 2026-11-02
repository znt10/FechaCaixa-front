import { decimalParaDigitos, formatarMoeda } from "@/features/fechamento/components/campos";

import type { Boleto, ResumoDosBoletos } from "./services/boletos";

/** O tom da etiqueta: vermelho pede ação hoje, amarelo pede atenção logo. */
export type TomDoPrazo = "alerta" | "aviso" | "neutro";

/** Até quantos dias o tom é amarelo; o aviso do painel vai até 7. */
const DIAS_DO_DESTAQUE = 3;

/** Dias de calendário entre duas datas AAAA-MM-DD. Pelo UTC: a conta em hora
 *  local erraria um dia na virada do horário de verão. */
const diasEntre = (de: string, ate: string) => {
  const emUtc = (data: string) => {
    const [ano, mes, dia] = data.split("-").map(Number);
    return Date.UTC(ano, mes - 1, dia);
  };
  return Math.round((emUtc(ate) - emUtc(de)) / 86_400_000);
};

const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

export const prazoDoBoleto = (
  vencimento: string | null,
  hoje: string,
): { rotulo: string; tom: TomDoPrazo } => {
  if (!vencimento) return { rotulo: "Sem data", tom: "alerta" };

  const faltam = diasEntre(hoje, vencimento);
  if (faltam < 0) return { rotulo: `Vencido há ${dias(-faltam)}`, tom: "alerta" };
  if (faltam === 0) return { rotulo: "Vence hoje", tom: "alerta" };
  if (faltam === 1) return { rotulo: "Vence amanhã", tom: "aviso" };
  return {
    rotulo: `Vence em ${dias(faltam)}`,
    tom: faltam <= DIAS_DO_DESTAQUE ? "aviso" : "neutro",
  };
};

/** O que a faixa do painel diz, ou null quando nada pede atenção. */
export const textoDaFaixa = (resumo: ResumoDosBoletos): string | null => {
  const proximos = resumo.em_3_dias + resumo.em_7_dias;
  const partes = [
    resumo.vencidos > 0 &&
      `${resumo.vencidos} ${resumo.vencidos === 1 ? "vencido" : "vencidos"}`,
    resumo.hoje > 0 && `${resumo.hoje} ${resumo.hoje === 1 ? "vence" : "vencem"} hoje`,
    proximos > 0 &&
      `${proximos} ${proximos === 1 ? "vence" : "vencem"} nos próximos 7 dias`,
    resumo.sem_data > 0 && `${resumo.sem_data} sem data`,
  ].filter(Boolean);

  return partes.length > 0 ? `Boletos: ${partes.join(" · ")}` : null;
};

/** A data de hoje no aparelho, AAAA-MM-DD. */
export const hojeLocal = () => {
  const agora = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
};

/** "20/11", do AAAA-MM-DD do servidor. */
export const diaEMes = (data: string) => {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
};

/** A linha que fica no formulário depois de salvar: a loja vê que foi. */
export const resumoDoBoletoSalvo = ({
  vencimento,
  valor,
}: Pick<Boleto, "vencimento" | "valor">) => {
  const partes = ["Boleto salvo", vencimento ? `vence ${diaEMes(vencimento)}` : "sem data"];
  if (valor) partes.push(`R$ ${formatarMoeda(decimalParaDigitos(valor))}`);
  return partes.join(" · ");
};
