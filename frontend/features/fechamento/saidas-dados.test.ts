import { describe, expect, it } from "vitest";

import { montarSaidas } from "./saidas-dados";
import type { FechamentoLido, LojaDoPainel } from "./services/painel";

// Os testes do backend (app/tests/test_fechamento_caixa.py) montam o payload
// num helper e sobrescrevem so o que o caso precisa. Mesma ideia aqui: o que
// aparece no teste e o que ele esta afirmando.

const CENTRO: LojaDoPainel = { id: "l-centro", nome_loja: "Loja Centro", ativo: true };
const SHOPPING: LojaDoPainel = { id: "l-shopping", nome_loja: "Shopping", ativo: true };

let contador = 0;

const fechamento = (extra: Partial<FechamentoLido> = {}): FechamentoLido => {
  contador += 1;
  return {
    id: `f-${contador}`,
    loja: CENTRO.id,
    loja_nome: CENTRO.nome_loja,
    nome_funcionario: "Ana Paula",
    lancado_por: null,
    data: "2026-08-22",
    periodo: "MANHA",
    pix: "100.00",
    cartao: "0.00",
    dinheiro: "0.00",
    link_pagamento: "0.00",
    recebido: "100.00",
    total: "100.00",
    registrado: "0.00",
    saidas: "0.00",
    total_liquido: "100.00",
    houve_retirada: false,
    responsavel_retirada: null,
    responsavel_retirada_nome: null,
    valor_retirado: null,
    retiradas: [],
    despesas: [],
    houve_devolucao: false,
    devolucao_valor: null,
    houve_desperdicio: false,
    desperdicio_detalhes: null,
    consumos: [],
    desperdicios: [],
    conferido: false,
    conferido_em: null,
    conferido_por_nome: null,
    editado_por_nome: null,
    created_at: "2026-08-22T11:30:00Z",
    ...extra,
  };
};

let despesaContador = 0;

const despesa = (valor: string, descricao = "Gás") => {
  despesaContador += 1;
  return { id: `d-${despesaContador}`, descricao, valor };
};

const comDespesa = (valor: string, descricao = "Gás", extra: Partial<FechamentoLido> = {}) =>
  fechamento({ despesas: [despesa(valor, descricao)], ...extra });

const comDevolucao = (valor: string, extra: Partial<FechamentoLido> = {}) =>
  fechamento({ houve_devolucao: true, devolucao_valor: valor, ...extra });

const comRetirada = (valor: string, quem = "Marina", extra: Partial<FechamentoLido> = {}) =>
  fechamento({
    houve_retirada: true,
    responsavel_retirada: "r-1",
    responsavel_retirada_nome: quem,
    valor_retirado: valor,
    ...extra,
  });

let perdaContador = 0;

const perda = (nome: string, quantidade: number) => {
  perdaContador += 1;
  return {
    id: `p-${perdaContador}`,
    salgado: `s-${nome}`,
    nome,
    categoria_nome: "Salgados grande",
    quantidade,
  };
};

describe("montarSaidas", () => {
  it("quebra um turno com despesa e retirada em duas saidas", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [comDespesa("120.00", "Gás", { houve_retirada: true, responsavel_retirada: "r-1", responsavel_retirada_nome: "Marina", valor_retirado: "300.00" })],
      "TODAS",
    );

    expect(resumo.linhas[0].saidas.map((s) => s.tipo)).toEqual(["DESPESA", "RETIRADA"]);
    expect(resumo.linhas[0].total).toBe(420);
  });

  it("usa quem retirou como descricao da retirada", () => {
    const resumo = montarSaidas([CENTRO], [comRetirada("300.00", "Bruno")], "TODAS");

    expect(resumo.linhas[0].saidas[0].descricao).toBe("Bruno");
  });

  it("duas pessoas que retiraram no mesmo turno viram duas saidas", () => {
    // O resumo (primeira pessoa e soma) fica de lado quando ha linhas: somado
    // num nome so, o fim do mes nao cobra de cada um o que levou.
    const resumo = montarSaidas(
      [CENTRO],
      [
        comRetirada("500.00", "Marina", {
          retiradas: [
            { id: "r-a", responsavel: "r-1", nome: "Marina", valor: "300.00" },
            { id: "r-b", responsavel: "r-2", nome: "Bruno", valor: "200.00" },
          ],
        }),
      ],
      "TODAS",
    );

    expect(
      resumo.linhas[0].saidas.map((s) => [s.tipo, s.descricao, s.valor]),
    ).toEqual([
      ["RETIRADA", "Marina", 300],
      ["RETIRADA", "Bruno", 200],
    ]);
    expect(resumo.linhas[0].total).toBe(500);
  });

  /** A flag ligada com valor zerado e o estado que o formulario deixa no meio
   *  do caminho — nao e uma saida, e nao pode virar linha de R$ 0,00. */
  it("ignora a flag ligada sem valor", () => {
    const resumo = montarSaidas([CENTRO], [comDespesa("0.00")], "TODAS");

    expect(resumo.linhas).toEqual([]);
    expect(resumo.totais.tudo).toBe(0);
  });

  it("deixa de fora a loja que nao teve saida no periodo", () => {
    const resumo = montarSaidas(
      [CENTRO, SHOPPING],
      [comDespesa("120.00"), fechamento({ loja: SHOPPING.id })],
      "TODAS",
    );

    expect(resumo.linhas.map((l) => l.lojaId)).toEqual([CENTRO.id]);
  });

  it("ordena as lojas da que mais gastou para a que menos gastou", () => {
    const resumo = montarSaidas(
      [CENTRO, SHOPPING],
      [comDespesa("50.00"), comDespesa("900.00", "Manutenção", { loja: SHOPPING.id })],
      "TODAS",
    );

    expect(resumo.linhas.map((l) => l.lojaId)).toEqual([SHOPPING.id, CENTRO.id]);
  });

  /** A lista de uma loja e cronologica ao contrario: quem abre o detalhe quer
   *  ver o que saiu ontem, nao o que saiu no dia 1. */
  it("lista a saida mais recente primeiro, e a tarde antes da manha", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [
        comDespesa("10.00", "Dia 20", { data: "2026-08-20", periodo: "TARDE" }),
        comDespesa("20.00", "Dia 22 manha", { data: "2026-08-22", periodo: "MANHA" }),
        comDespesa("30.00", "Dia 22 tarde", { data: "2026-08-22", periodo: "TARDE" }),
      ],
      "TODAS",
    );

    expect(resumo.linhas[0].saidas.map((s) => s.descricao)).toEqual([
      "Dia 22 tarde",
      "Dia 22 manha",
      "Dia 20",
    ]);
  });

  /** Os tres totais sao os tiles do topo, e sao eles que filtram a tabela: se
   *  encolhessem junto com o filtro, escolher "Despesas" zeraria o tile de
   *  retiradas e o proprio caminho de volta. */
  it("filtra as linhas sem mexer nos totais do periodo", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [comDespesa("120.00"), comRetirada("300.00")],
      "DESPESA",
    );

    expect(resumo.linhas[0].saidas.map((s) => s.tipo)).toEqual(["DESPESA"]);
    expect(resumo.linhas[0].total).toBe(120);
    expect(resumo.totais).toEqual({
      // "tudo" e so o que a empresa perdeu — a retirada de 300 nao entra.
      tudo: 120,
      despesas: 120,
      retiradas: 300,
      devolucoes: 0,
      consumo: 0,
      desperdicio: 0,
    });
  });
});

describe("empresa de um fechamento por dia", () => {
  /** Com "DIA" fora do mapa de ordem, a subtracao dava NaN. NaN e falsy, entao
   *  o `||` caia no criterio seguinte e a ordem sobrevivia por acidente — o
   *  defeito aparecia no tipo, nao no resultado. Estes dois testes travam o
   *  comportamento para que a proxima mexida na ordenacao nao dependa disso. */
  it("ordena o fechamento do dia inteiro junto com os outros", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [
        comDespesa("10.00", "Dia 20", { data: "2026-08-20", periodo: "DIA" }),
        comDespesa("20.00", "Dia 22", { data: "2026-08-22", periodo: "DIA" }),
      ],
      "TODAS",
    );

    expect(resumo.linhas[0].saidas.map((s) => s.descricao)).toEqual([
      "Dia 22",
      "Dia 20",
    ]);
  });

  it("mantem despesa antes de retirada no mesmo dia inteiro", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [
        fechamento({
          periodo: "DIA",
          despesas: [despesa("50.00", "Gás")],
          houve_retirada: true,
          responsavel_retirada: "r-1",
          responsavel_retirada_nome: "Marina",
          valor_retirado: "200.00",
        }),
      ],
      "TODAS",
    );

    expect(resumo.linhas[0].saidas.map((s) => s.tipo)).toEqual([
      "DESPESA",
      "RETIRADA",
    ]);
  });
});

describe("consumo dos encarregados", () => {
  const comeu = (nome: string, valor: string) => ({
    id: `${nome}-${valor}`,
    encarregado: nome.toLowerCase(),
    nome,
    valor,
  });

  const comConsumo = (valor = "20.00", quem = "Jose") =>
    fechamento({ consumos: [comeu(quem, valor)] });

  it("mostra o consumo no nome de quem comeu, e nao de quem lancou", () => {
    // Quem preenche e o gerente, dizendo de quem foi cada valor.
    const resumo = montarSaidas(
      [CENTRO],
      [fechamento({ nome_funcionario: "Ana", consumos: [comeu("Jose", "20.00")] })],
    );

    const consumos = resumo.linhas[0].saidas.filter((s) => s.tipo === "CONSUMO");
    expect(consumos.map((s) => s.descricao)).toEqual(["Jose"]);
    expect(resumo.totais.consumo).toBe(20);
  });

  it("soma o consumo de turnos diferentes", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [comConsumo("12.50", "Jose"), comConsumo("7.50", "Marina")],
    );

    expect(resumo.totais.consumo).toBe(20);
    expect(
      resumo.linhas[0].saidas.filter((s) => s.tipo === "CONSUMO").map((s) => s.descricao),
    ).toEqual(expect.arrayContaining(["Jose", "Marina"]));
  });

  it("varias pessoas no mesmo turno viram varias linhas", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [fechamento({ consumos: [comeu("Jose", "12.50"), comeu("Marina", "7.50")] })],
    );

    expect(
      resumo.linhas[0].saidas.filter((s) => s.tipo === "CONSUMO"),
    ).toHaveLength(2);
    expect(resumo.totais.consumo).toBe(20);
  });

  it("nao soma consumo no total que saiu da gaveta", () => {
    // A regra que a tela existe para nao mentir: consumo nao saiu da gaveta.
    // Se entrar em `tudo`, a gerencia cobra da loja um dinheiro que esta la.
    const resumo = montarSaidas(
      [CENTRO],
      [comConsumo(), fechamento({ despesas: [despesa("30.00", "Gás")] })],
    );

    expect(resumo.totais.despesas).toBe(30);
    expect(resumo.totais.consumo).toBe(20);
    expect(resumo.totais.tudo).toBe(30);
  });

  it("a retirada nao entra em tudo, como o consumo", () => {
    // O dono levou para guardar: o dinheiro mudou de mao e continua sendo da
    // empresa. Somar aqui faria a tela dizer que a loja perdeu justamente o
    // que foi posto a salvo — e quanto mais ele recolhesse, que e o
    // comportamento certo, maior o "prejuizo" na tela.
    const resumo = montarSaidas(
      [CENTRO],
      [comRetirada("300.00"), comDespesa("120.00")],
    );

    expect(resumo.totais.retiradas).toBe(300);
    expect(resumo.totais.tudo).toBe(120);
  });

  it("a devolucao entra em tudo: a venda foi desfeita", () => {
    // Ao contrario da retirada, esse dinheiro nao volta: foi para a mao do
    // cliente e a venda deixou de existir. Ela nao mexe no TOTAL DO CAIXA —
    // isso e outra conta, no painel — mas aqui a pergunta e o que se perdeu.
    const resumo = montarSaidas([CENTRO], [comDevolucao("50.00")]);

    expect(resumo.totais.devolucoes).toBe(50);
    expect(resumo.totais.tudo).toBe(50);
    expect(resumo.linhas[0].saidas[0].descricao).toBe("Devolução ao cliente");
  });

  it("um turno com varias despesas vira varias linhas", () => {
    // Antes cabia uma so por turno, e gas e agua do mesmo dia iam empilhados
    // num campo de texto.
    const resumo = montarSaidas(
      [CENTRO],
      [
        fechamento({
          despesas: [despesa("60.00", "Gás"), despesa("40.00", "Água")],
        }),
      ],
    );

    expect(resumo.linhas[0].saidas.map((s) => s.descricao)).toEqual([
      "Gás",
      "Água",
    ]);
    expect(resumo.totais.despesas).toBe(100);
  });

  it("ignora linha sem valor", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [fechamento({ consumos: [comeu("Jose", "0.00")] })],
    );

    expect(resumo.linhas).toEqual([]);
    expect(resumo.totais.consumo).toBe(0);
  });

  it("filtra so os consumos quando se pede o tipo", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [
        comConsumo(),
        fechamento({ despesas: [despesa("30.00", "Gás")] }),
      ],
      "CONSUMO",
    );

    expect(resumo.linhas[0].saidas.every((s) => s.tipo === "CONSUMO")).toBe(true);
    expect(resumo.linhas[0].total).toBe(20);
  });
});

describe("a ordem da lista", () => {
  const OUTRA = { id: "l2", nome_loja: "Ágata", ativo: true };

  const gastos = () => [
    comDespesa("90.00", "Gás"),
    comDespesa("30.00", "Gás", { loja: OUTRA.id, loja_nome: OUTRA.nome_loja }),
  ];

  it("por valor, a maior primeiro — a pergunta padrao da tela", () => {
    const resumo = montarSaidas([CENTRO, OUTRA], gastos());

    expect(resumo.linhas.map((l) => l.lojaNome)).toEqual([
      "Loja Centro",
      "Ágata",
    ]);
  });

  it("por nome, para achar uma loja na lista", () => {
    const resumo = montarSaidas([CENTRO, OUTRA], gastos(), "TODAS", "NOME");

    // Ordem trocada em relacao a do valor, e o acento nao joga a loja para o
    // fim da lista.
    expect(resumo.linhas.map((l) => l.lojaNome)).toEqual([
      "Ágata",
      "Loja Centro",
    ]);
  });
});

describe("a composicao de cada loja", () => {
  it("separa quanto foi de cada tipo, para a barra da linha", () => {
    // A barra responde "no que foi" sem precisar abrir a loja — que e a
    // pergunta desta tela.
    const resumo = montarSaidas(
      [CENTRO],
      [
        fechamento({ despesas: [despesa("100.00", "Gás")] }),
        fechamento({
          houve_retirada: true,
          responsavel_retirada_nome: "Marina",
          valor_retirado: "60.00",
        }),
        fechamento({
          consumos: [{ id: "c1", encarregado: "jose", nome: "Jose", valor: "15.00" }],
        }),
      ],
    );

    expect(resumo.linhas[0].porTipo).toEqual({
      DESPESA: 100,
      RETIRADA: 60,
      DEVOLUCAO: 0,
      CONSUMO: 15,
    });
  });

  it("com um filtro ligado, a barra conta so o que a lista mostra", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [
        fechamento({ despesas: [despesa("100.00", "Gás")] }),
        fechamento({
          consumos: [{ id: "c1", encarregado: "jose", nome: "Jose", valor: "15.00" }],
        }),
      ],
      "CONSUMO",
    );

    expect(resumo.linhas[0].porTipo).toEqual({
      DESPESA: 0,
      RETIRADA: 0,
      DEVOLUCAO: 0,
      CONSUMO: 15,
    });
  });
});

describe("o desperdicio nas saidas", () => {
  it("conta em unidades e fica fora dos totais em R$", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [comDespesa("100.00", "Gás", {
        desperdicios: [perda("Coxinha", 8), perda("Kibe", 3)],
      })],
      "TODAS",
    );

    // O dinheiro nao mudou: ninguem pagou pela coxinha que foi para o lixo.
    expect(resumo.totais.tudo).toBe(100);
    expect(resumo.linhas[0].total).toBe(100);
    // As unidades tem numero proprio, separado.
    expect(resumo.totais.desperdicio).toBe(11);
    expect(resumo.linhas[0].unidadesDesperdicadas).toBe(11);
  });

  it("a saida de desperdicio carrega quantidade e nao valor", () => {
    const resumo = montarSaidas(
      [CENTRO],
      [fechamento({ desperdicios: [perda("Coxinha", 8)] })],
      "TODAS",
    );

    const linha = resumo.linhas[0].saidas.find((s) => s.tipo === "DESPERDICIO");
    expect(linha?.quantidade).toBe(8);
    expect(linha?.valor).toBe(0);
    expect(linha?.descricao).toBe("Coxinha");
  });

  it("turno sem desperdicio nao ganha linha nem contagem", () => {
    const resumo = montarSaidas([CENTRO], [comDespesa("100.00")], "TODAS");

    expect(resumo.totais.desperdicio).toBe(0);
    expect(resumo.linhas[0].saidas.some((s) => s.tipo === "DESPERDICIO")).toBe(false);
  });
});
