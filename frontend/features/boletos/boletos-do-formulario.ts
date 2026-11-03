import { digitosParaDecimal } from "@/features/fechamento/components/campos";

import type { Boleto } from "./services/boletos";

/** O que a seção de boletos guarda no formulário do fechamento. Mora no
 *  formulário, e não na seção: a revisão do envio tira a seção da tela, e
 *  voltar dela não pode sumir com os boletos já salvos. */
export type BoletosDoTurno = {
  houve: boolean;
  salvos: Boleto[];
  /** Tem foto escolhida que ainda não foi salva. */
  pendente: boolean;
};

export const SEM_BOLETOS: BoletosDoTurno = { houve: false, salvos: [], pendente: false };

/** Segura o envio do turno com foto de boleto sem salvar: a revisão tira o
 *  cartão da tela, e o boleto se perderia calado — o "esqueceu de avisar"
 *  que esta seção existe para evitar. */
export const avisoDeBoletoNaoSalvo = ({
  houve,
  pendente,
}: Pick<BoletosDoTurno, "houve" | "pendente">): string | null =>
  houve && pendente
    ? "Há um boleto com foto que não foi salvo. Toque em “Salvar boleto” antes de enviar o caixa."
    : null;

/** O campo de moeda apagado mostra 0,00: zero é não ter digitado. */
export const valorDoCampo = (digitos: string): string | undefined =>
  Number(digitos || "0") > 0 ? digitosParaDecimal(digitos) : undefined;
