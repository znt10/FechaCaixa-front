import { describe, expect, it } from "vitest";

import { montarDesperdicioPorSalgado } from "./saidas-dados";
import type { FechamentoLido } from "./services/painel";

/**
 * O desperdicio somado por salgado.
 *
 * Por loja, a lista so dizia "Limão · 13 un" — e a pergunta que o catalogo
 * veio responder e QUAL salgado vai para o lixo. Mesmo desenho do consumo por
 * pessoa: ligar o filtro troca a lista de loja para o item.
 */
const turno = (campos: Partial<FechamentoLido> = {}): FechamentoLido =>
  ({
    id: Math.random().toString(),
    loja: "l1",
    loja_nome: "Lapa",
    data: "2026-08-10",
    periodo: "MANHA",
    nome_funcionario: "Gerente",
    consumos: [],
    desperdicios: [],
    ...campos,
  }) as FechamentoLido;

const perdeu = (
  salgado: string,
  nome: string,
  quantidade: number,
  categoria_nome = "Salgados grande",
) => ({
  id: `${salgado}-${Math.random()}`,
  salgado,
  nome,
  categoria_nome,
  quantidade,
});

describe("o desperdicio por salgado", () => {
  it("junta numa linha so o mesmo item perdido em lojas diferentes", () => {
    const linhas = montarDesperdicioPorSalgado([
      turno({ loja_nome: "Lapa", desperdicios: [perdeu("s1", "Coxinha", 3)] }),
      turno({
        loja: "l2",
        loja_nome: "Limão",
        desperdicios: [perdeu("s1", "Coxinha", 5)],
      }),
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].nome).toBe("Coxinha");
    expect(linhas[0].total).toBe(8);
    expect(linhas[0].lojas).toEqual(["Lapa", "Limão"]);
  });

  it("nao mistura itens de mesmo nome em categorias diferentes", () => {
    // "Coxinha" existe em Salgados grande e em Salgados mini: agrupar pelo
    // nome somaria as duas e esconderia qual delas se perde.
    const linhas = montarDesperdicioPorSalgado([
      turno({
        desperdicios: [
          perdeu("grande", "Coxinha", 2, "Salgados grande"),
          perdeu("mini", "Coxinha", 7, "Salgados mini"),
        ],
      }),
    ]);

    expect(linhas).toHaveLength(2);
    expect(linhas.map((l) => [l.categoria, l.total])).toEqual([
      ["Salgados mini", 7],
      ["Salgados grande", 2],
    ]);
  });

  it("conta unidades, nunca reais", () => {
    const [linha] = montarDesperdicioPorSalgado([
      turno({ desperdicios: [perdeu("s1", "Kibe", 4)] }),
    ]);

    expect(linha.total).toBe(4);
    expect(linha.saidas[0].quantidade).toBe(4);
    expect(linha.saidas[0].valor).toBe(0);
  });

  it("ordena por nome quando pedido", () => {
    const linhas = montarDesperdicioPorSalgado(
      [
        turno({
          desperdicios: [perdeu("s1", "Kibe", 9), perdeu("s2", "Coxinha", 1)],
        }),
      ],
      "NOME",
    );

    expect(linhas.map((l) => l.nome)).toEqual(["Coxinha", "Kibe"]);
  });
});
