import { apiV1 } from "@/shared/services/api";
import type {
  FechamentoConfirmacao,
  FechamentoPayload,
  Periodo,
} from "@/features/fechamento/services/fechamentos";

// ======================================================
// 🔹 REPOR UM DIA PELO PAINEL
// ======================================================
// Mesmo endpoint do formulario da loja, outra porta: la quem responde e o
// cookie do aparelho, aqui e a sessao do gerente. O backend trata os dois como
// donos do mesmo `create` — e so deste lado aplica o limite de 30 dias e a
// recusa de turno repetido.
//
// Por isso as chamadas passam pelo `apiV1` e nao pelo `apiV1Publico`: um 401
// aqui e sessao expirada de verdade, e leva pro /login como em qualquer outra
// tela do painel.

export type TurnosDaData = {
  data: string;
  periodos: Periodo[];
  /** "Domingo", "Feriado: Natal"... ou null num dia comum. */
  motivo: string | null;
};

/**
 * Quais turnos existiam na data escolhida.
 *
 * Vem do servidor a cada troca de data porque a resposta depende do calendario
 * daquela empresa: domingo e feriado (nacionais + os locais da conta) viram um
 * turno so, e uma empresa que fecha o caixa uma vez por dia nunca teve manha
 * nem tarde. Calcular isso no navegador seria uma segunda copia da regra.
 */
export const getTurnosDaData = async (data: string): Promise<TurnosDaData> => {
  const res = await apiV1(`/fechamentos-caixa/turnos/?data=${data}`);
  return res.json();
};

/**
 * O payload da loja mais o dia.
 *
 * `FechamentoPayload` nao tem `data` porque o formulario da loja nunca escolhe
 * uma — ele manda hoje, e quem carimba e o servidor. Aqui a data e o campo
 * inteiro da tela, entao ela e obrigatoria: um envio sem ela cairia
 * silenciosamente no dia de hoje, que e justamente o dia que nao se esta
 * repondo.
 */
export type ReposicaoPayload = FechamentoPayload & { data: string };

export const lancarFechamentoPeloPainel = async (
  payload: ReposicaoPayload,
): Promise<FechamentoConfirmacao> => {
  const res = await apiV1("/fechamentos-caixa/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
};
