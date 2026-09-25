import { decimalParaDigitos, formatarMoeda } from "@/features/fechamento/components/campos";
import { rotuloDoPeriodo } from "@/features/fechamento/painel-dados";
import type {
  Encarregado,
  FechamentoPayload,
  LojaOpcao,
  Periodo,
  ResponsavelRetirada,
  Salgado,
} from "@/features/fechamento/services/fechamentos";

/** Uma linha da revisao: o que e, e quanto. */
export type LinhaDaRevisao = { rotulo: string; valor: string };

/** Um grupo da revisao — retirada, despesas, consumo. So existe se houve. */
export type BlocoDaRevisao = { titulo: string; linhas: LinhaDaRevisao[] };

export type Revisao = {
  loja: string;
  turno: string;
  lancadoPor: string;
  /** As quatro formas de pagamento, sempre as quatro. */
  recebido: LinhaDaRevisao[];
  /** O que saiu ou ficou anotado a parte, na ordem do formulario. Vazio no
   *  turno comum, que e a maioria. */
  blocos: BlocoDaRevisao[];
  /** O total como o rodape do formulario ja mostrou. */
  total: string;
};

/** As listas de cadastro que traduzem os ids do payload, mais o total que o
 *  formulario ja calculou. */
export type ContextoDaRevisao = {
  lojas: LojaOpcao[];
  quemLanca: Encarregado[];
  quemConsome: Encarregado[];
  responsaveis: ResponsavelRetirada[];
  /** Traduz o id do salgado em nome. Opcional porque nem toda tela que monta
   *  a revisao carrega o catalogo — a correcao, por exemplo, ainda nao mexe
   *  em desperdicio. */
  catalogo?: Salgado[];
  total: string;
};

/** Quem fecha o caixa uma vez por dia nao tem manha nem tarde. */
export const rotuloDoTurno = (periodo: Periodo) =>
  periodo === "DIA" ? "Dia inteiro" : rotuloDoPeriodo(periodo);

/** Cadastro pode ter sido desativado entre abrir o formulario e enviar: dizer
 *  que nao sabe e melhor que mostrar um id cru para quem esta no balcao. */
const SEM_NOME = "Não identificado";

// Aceita undefined porque retirada e devolucao sao opcionais no payload: o
// campo nem existe quando a loja nao marcou que houve.
const emReais = (decimal: string | null | undefined) =>
  formatarMoeda(decimalParaDigitos(decimal ?? null) || "0");

/**
 * O payload que sera enviado, traduzido para o que a loja consegue conferir.
 *
 * Recebe o payload pronto, e nao os campos soltos da tela, porque a revisao
 * precisa mostrar exatamente o que vai ser mandado — remontar depois abriria a
 * chance de a tela dizer um numero e o envio levar outro.
 */
export const montarRevisao = (
  payload: FechamentoPayload,
  contexto: ContextoDaRevisao,
): Revisao => {
  const loja = contexto.lojas.find((opcao) => opcao.id === payload.loja);
  const lancou = contexto.quemLanca.find((p) => p.id === payload.lancado_por);

  // Na ordem do formulario: a pessoa acabou de preencher assim, e conferir
  // numa ordem diferente e o que faz o olho pular uma linha.
  const blocos: BlocoDaRevisao[] = [];

  if (payload.houve_retirada && payload.retiradas.length > 0) {
    blocos.push({
      titulo: payload.retiradas.length > 1 ? "Retiradas" : "Retirada",
      linhas: payload.retiradas.map((retirada) => ({
        rotulo:
          contexto.responsaveis.find((r) => r.id === retirada.responsavel)?.nome ?? SEM_NOME,
        valor: emReais(retirada.valor),
      })),
    });
  }

  if (payload.despesas.length > 0) {
    blocos.push({
      titulo: "Despesas",
      linhas: payload.despesas.map((despesa) => ({
        rotulo: despesa.descricao,
        valor: emReais(despesa.valor),
      })),
    });
  }

  if (payload.houve_devolucao) {
    // O rotulo responde a duvida que a loja tem toda vez: o dinheiro saiu da
    // mesma gaveta que o funcionario ja contou, entao ela ja se descontou.
    blocos.push({
      titulo: "Devolução",
      linhas: [{ rotulo: "Não muda o total", valor: emReais(payload.devolucao_valor) }],
    });
  }

  if (payload.houve_desperdicio) {
    // O unico bloco sem dinheiro: o que se perdeu e descrito, nao contado.
    blocos.push({
      titulo: "Desperdício",
      linhas: [{ rotulo: payload.desperdicio_detalhes ?? "", valor: "" }],
    });
  }

  if (payload.consumos.length > 0) {
    blocos.push({
      titulo: "Consumo",
      linhas: payload.consumos.map((consumo) => ({
        rotulo:
          contexto.quemConsome.find((p) => p.id === consumo.encarregado)?.nome ?? SEM_NOME,
        valor: emReais(consumo.valor),
      })),
    });
  }

  if (payload.desperdicios?.length) {
    blocos.push({
      titulo: "Desperdício",
      linhas: payload.desperdicios.map((linha) => {
        const item = (contexto.catalogo ?? []).find((s) => s.id === linha.salgado);
        // "un" e nao R$: o catalogo nao tem preco, e passar isto pelo
        // formatador de moeda leria 8 coxinhas como oito reais.
        return { rotulo: item?.nome ?? SEM_NOME, valor: `${linha.quantidade} un` };
      }),
    });
  }

  return {
    loja: loja?.nome_loja ?? SEM_NOME,
    turno: rotuloDoTurno(payload.periodo),
    lancadoPor: lancou?.nome ?? SEM_NOME,
    recebido: [
      { rotulo: "PIX", valor: emReais(payload.pix) },
      { rotulo: "Cartão", valor: emReais(payload.cartao) },
      { rotulo: "Dinheiro", valor: emReais(payload.dinheiro) },
      { rotulo: "Link de pagamento", valor: emReais(payload.link_pagamento) },
    ],
    blocos,
    total: contexto.total,
  };
};
