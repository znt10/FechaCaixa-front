import { describe, expect, it } from "vitest";

import { montarRevisao } from "./revisao-do-envio";
import type {
  Encarregado,
  FechamentoPayload,
  LojaOpcao,
  ResponsavelRetirada,
  Salgado,
} from "./services/fechamentos";

/**
 * A revisao que a loja le antes de enviar o fechamento.
 *
 * O payload carrega id de loja, de quem lancou, de quem retirou e de quem
 * consumiu — mostrar id para quem esta no balcao nao serviria de nada. E aqui
 * que o id vira nome, e e por isso que este modulo existe separado da tela.
 *
 * O que esta em jogo: se a revisao mostrar um numero e o envio mandar outro, a
 * tela vira teatro e o erro de digitacao passa assim mesmo.
 */

const pessoa = (id: string, nome: string, extra: Partial<Encarregado> = {}): Encarregado => ({
  id,
  nome,
  pode_lancar_caixa: true,
  pode_consumir: true,
  ativo: true,
  ...extra,
});

const LOJAS: LojaOpcao[] = [
  { id: "loja-1", nome_loja: "Centro" },
  { id: "loja-2", nome_loja: "Pirituba" },
];

const QUEM_LANCA: Encarregado[] = [pessoa("enc-1", "Marina"), pessoa("enc-2", "Paulo")];

const QUEM_CONSOME: Encarregado[] = [pessoa("enc-2", "Paulo"), pessoa("enc-3", "Rita")];

const RESPONSAVEIS: ResponsavelRetirada[] = [
  { id: "resp-1", nome: "Dona Cida", ativo: true },
  { id: "resp-2", nome: "Seu Juca", ativo: true },
];

const payloadBase = (extra: Partial<FechamentoPayload> = {}): FechamentoPayload => ({
  loja: "loja-2",
  lancado_por: "enc-1",
  periodo: "TARDE",
  pix: "100.00",
  cartao: "250.50",
  dinheiro: "80.00",
  link_pagamento: "0.00",
  houve_retirada: false,
  retiradas: [],
  despesas: [],
  houve_devolucao: false,
  devolucao_valor: null,
  houve_desperdicio: false,
  desperdicio_detalhes: null,
  consumos: [],
  ...extra,
});

const contexto = {
  lojas: LOJAS,
  quemLanca: QUEM_LANCA,
  quemConsome: QUEM_CONSOME,
  responsaveis: RESPONSAVEIS,
  total: "430,50",
};

describe("a identificacao do lancamento", () => {
  it("troca os ids por nome de loja, turno e quem lancou", () => {
    const revisao = montarRevisao(payloadBase(), contexto);

    expect(revisao.loja).toBe("Pirituba");
    expect(revisao.turno).toBe("Tarde");
    expect(revisao.lancadoPor).toBe("Marina");
  });

  it("chama o turno unico de 'Dia inteiro', e nao pelo nome do periodo", () => {
    // Quem fecha o caixa uma vez por dia nao tem manha nem tarde: "DIA" na
    // tela do funcionario precisa ler como o dia todo.
    const revisao = montarRevisao(payloadBase({ periodo: "DIA" }), contexto);

    expect(revisao.turno).toBe("Dia inteiro");
  });

  it("nao inventa nome quando o id nao esta na lista", () => {
    // Cadastro desativado entre abrir o formulario e enviar. Melhor a revisao
    // dizer que nao sabe do que mostrar um id cru ou uma string vazia.
    const revisao = montarRevisao(payloadBase({ lancado_por: "sumiu" }), contexto);

    expect(revisao.lancadoPor).toBe("Não identificado");
  });
});

describe("o que a loja recebeu", () => {
  it("mostra as quatro formas de pagamento, em reais", () => {
    const revisao = montarRevisao(payloadBase(), contexto);

    expect(revisao.recebido).toEqual([
      { rotulo: "PIX", valor: "100,00" },
      { rotulo: "Cartão", valor: "250,50" },
      { rotulo: "Dinheiro", valor: "80,00" },
      { rotulo: "Link de pagamento", valor: "0,00" },
    ]);
  });

  it("mostra as quatro mesmo zeradas", () => {
    // Zero e informacao: "nao entrou nada no PIX" e o que a pessoa confere.
    // Esconder a linha zerada faria a ausencia parecer esquecimento.
    const revisao = montarRevisao(
      payloadBase({ pix: "0.00", cartao: "0.00", dinheiro: "0.00", link_pagamento: "0.00" }),
      contexto,
    );

    expect(revisao.recebido).toHaveLength(4);
  });

  it("repassa o total ja calculado pelo formulario", () => {
    // Vem pronto de proposito: o rodape do formulario e a revisao precisam
    // mostrar o mesmo numero, e recalcular aqui abriria a chance de divergir.
    expect(montarRevisao(payloadBase(), contexto).total).toBe("430,50");
  });
});

describe("os blocos que so aparecem quando houve", () => {
  it("nao mostra bloco nenhum num turno sem retirada, despesa, devolucao nem consumo", () => {
    // O caso comum. Uma tela cheia de "Nao houve" faria a pessoa rolar por
    // nada justamente quando ela deveria estar conferindo os valores.
    expect(montarRevisao(payloadBase(), contexto).blocos).toEqual([]);
  });

  it("mostra a retirada com o nome de quem retirou", () => {
    const revisao = montarRevisao(
      payloadBase({
        houve_retirada: true,
        retiradas: [{ responsavel: "resp-1", valor: "50.00" }],
      }),
      contexto,
    );

    expect(revisao.blocos).toEqual([
      { titulo: "Retirada", linhas: [{ rotulo: "Dona Cida", valor: "50,00" }] },
    ]);
  });

  it("mostra cada pessoa que retirou, uma linha por pessoa", () => {
    // O dono e a socia no mesmo turno: somados numa linha so, o fim do mes
    // nao consegue cobrar de cada um o que levou.
    const revisao = montarRevisao(
      payloadBase({
        houve_retirada: true,
        retiradas: [
          { responsavel: "resp-1", valor: "50.00" },
          { responsavel: "resp-2", valor: "20.00" },
        ],
      }),
      contexto,
    );

    expect(revisao.blocos).toEqual([
      {
        titulo: "Retiradas",
        linhas: [
          { rotulo: "Dona Cida", valor: "50,00" },
          { rotulo: "Seu Juca", valor: "20,00" },
        ],
      },
    ]);
  });

  it("mostra cada despesa com a descricao que a loja digitou", () => {
    const revisao = montarRevisao(
      payloadBase({
        despesas: [
          { descricao: "Gás", valor: "120.00" },
          { descricao: "Água", valor: "15.50" },
        ],
      }),
      contexto,
    );

    expect(revisao.blocos).toEqual([
      {
        titulo: "Despesas",
        linhas: [
          { rotulo: "Gás", valor: "120,00" },
          { rotulo: "Água", valor: "15,50" },
        ],
      },
    ]);
  });

  it("mostra o consumo com o nome de cada pessoa", () => {
    const revisao = montarRevisao(
      payloadBase({
        consumos: [
          { encarregado: "enc-3", valor: "12.00" },
          { encarregado: "enc-2", valor: "8.00" },
        ],
      }),
      contexto,
    );

    expect(revisao.blocos).toEqual([
      {
        titulo: "Consumo",
        linhas: [
          { rotulo: "Rita", valor: "12,00" },
          { rotulo: "Paulo", valor: "8,00" },
        ],
      },
    ]);
  });

  it("mostra a devolucao dizendo que ela nao mexe no total", () => {
    // E a duvida que a loja tem toda vez: "por que a devolucao nao desceu o
    // total?". O dinheiro saiu da mesma gaveta que ja foi contada.
    const revisao = montarRevisao(
      payloadBase({ houve_devolucao: true, devolucao_valor: "30.00" }),
      contexto,
    );

    expect(revisao.blocos).toEqual([
      {
        titulo: "Devolução",
        linhas: [{ rotulo: "Não muda o total", valor: "30,00" }],
      },
    ]);
  });

  it("mostra o desperdicio, que e texto e nao valor", () => {
    const revisao = montarRevisao(
      payloadBase({ houve_desperdicio: true, desperdicio_detalhes: "2 caixas de tomate" }),
      contexto,
    );

    expect(revisao.blocos).toEqual([
      {
        titulo: "Desperdício",
        linhas: [{ rotulo: "2 caixas de tomate", valor: "" }],
      },
    ]);
  });

  it("mantem a ordem dos blocos igual a do formulario", () => {
    // A pessoa acabou de preencher nessa ordem. Conferir numa ordem diferente
    // e o que faz o olho pular uma linha.
    const revisao = montarRevisao(
      payloadBase({
        houve_retirada: true,
        retiradas: [{ responsavel: "resp-1", valor: "50.00" }],
        despesas: [{ descricao: "Gás", valor: "120.00" }],
        houve_devolucao: true,
        devolucao_valor: "30.00",
        houve_desperdicio: true,
        desperdicio_detalhes: "2 caixas",
        consumos: [{ encarregado: "enc-2", valor: "8.00" }],
      }),
      contexto,
    );

    expect(revisao.blocos.map((bloco) => bloco.titulo)).toEqual([
      "Retirada",
      "Despesas",
      "Devolução",
      "Desperdício",
      "Consumo",
    ]);
  });

  it("nao inventa nome para quem consumiu e sumiu do cadastro", () => {
    const revisao = montarRevisao(
      payloadBase({ consumos: [{ encarregado: "sumiu", valor: "5.00" }] }),
      contexto,
    );

    expect(revisao.blocos[0].linhas).toEqual([
      { rotulo: "Não identificado", valor: "5,00" },
    ]);
  });
});

const COXINHA: Salgado = {
  id: "s-coxinha",
  nome: "Coxinha",
  ativo: true,
  categoria: "c-1",
  categoria_nome: "Salgados grande",
  categoria_ativo: true,
};

describe("o desperdicio na revisao", () => {
  it("mostra o item e a quantidade em unidades, sem R$", () => {
    const revisao = montarRevisao(
      payloadBase({ desperdicios: [{ salgado: "s-coxinha", quantidade: 8 }] }),
      { ...contexto, catalogo: [COXINHA] },
    );

    const bloco = revisao.blocos.find((b) => b.titulo === "Desperdício");
    expect(bloco?.linhas).toEqual([{ rotulo: "Coxinha", valor: "8 un" }]);
  });

  it("nao cria o bloco quando nao houve desperdicio", () => {
    const revisao = montarRevisao(payloadBase(), { ...contexto, catalogo: [COXINHA] });

    expect(revisao.blocos.find((b) => b.titulo === "Desperdício")).toBeUndefined();
  });

  it("nao inventa nome quando o item saiu do catalogo", () => {
    const revisao = montarRevisao(
      payloadBase({ desperdicios: [{ salgado: "sumiu", quantidade: 2 }] }),
      { ...contexto, catalogo: [COXINHA] },
    );

    const bloco = revisao.blocos.find((b) => b.titulo === "Desperdício");
    expect(bloco?.linhas[0].rotulo).toBe("Não identificado");
  });
});
