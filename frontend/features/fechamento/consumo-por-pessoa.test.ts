import { describe, expect, it } from "vitest";

import { montarConsumoPorPessoa } from "./saidas-dados";
import type { ConsumoDoTurno, FechamentoLido } from "./services/painel";

/**
 * O consumo somado por pessoa.
 *
 * Por loja nao responde a pergunta: a pessoa nao e fixa numa loja — hoje esta
 * na Lapa, amanha no Limao — entao o consumo dela fica espalhado em varias
 * linhas e ninguem consegue somar de cabeca. E esse numero e o que a dona
 * desconta do salario no fim do mes, entao ele precisa estar inteiro num
 * lugar so.
 *
 * Quem lanca e o gerente, no fechamento do turno, dizendo de quem foi cada
 * valor — por isso um mesmo turno traz varias pessoas.
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
    houve_despesa: false,
    houve_retirada: false,
    ...campos,
  }) as FechamentoLido;

const comeu = (
  encarregado: string,
  nome: string,
  valor: string,
): ConsumoDoTurno => ({
  id: `${encarregado}-${Math.random()}`,
  encarregado,
  nome,
  valor,
});

describe("o consumo por pessoa", () => {
  it("junta numa linha so o que a pessoa consumiu em lojas diferentes", () => {
    const linhas = montarConsumoPorPessoa([
      turno({ loja_nome: "Lapa", consumos: [comeu("ana", "Ana", "20.00")] }),
      turno({
        loja: "l2",
        loja_nome: "Limão",
        consumos: [comeu("ana", "Ana", "30.00")],
      }),
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].nome).toBe("Ana");
    expect(linhas[0].total).toBe(50);
    // As lojas continuam legiveis: e o que mostra que ela circulou.
    expect(linhas[0].lojas).toEqual(["Lapa", "Limão"]);
  });

  it("separa as pessoas que comeram no mesmo turno", () => {
    // O ponto da mudanca: antes cabia um consumo por turno, e ele era sempre
    // de quem lancou o caixa.
    const linhas = montarConsumoPorPessoa([
      turno({
        consumos: [comeu("ana", "Ana", "20.00"), comeu("jose", "José", "70.00")],
      }),
    ]);

    // Do maior para o menor: a pergunta e quem consumiu mais.
    expect(linhas.map((l) => [l.nome, l.total])).toEqual([
      ["José", 70],
      ["Ana", 20],
    ]);
  });

  it("agrupa pelo cadastro, e nao pelo nome", () => {
    // Corrigir a grafia de alguem nao pode partir a pessoa em duas linhas com
    // metade do total em cada — a dona descontaria errado.
    const linhas = montarConsumoPorPessoa([
      turno({ data: "2026-08-01", consumos: [comeu("jose", "jose", "20.00")] }),
      turno({
        data: "2026-08-20",
        consumos: [comeu("jose", "José Neto", "30.00")],
      }),
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].total).toBe(50);
  });

  it("dois homonimos continuam sendo duas pessoas", () => {
    const linhas = montarConsumoPorPessoa([
      turno({
        consumos: [
          comeu("bruno-1", "Bruno", "10.00"),
          comeu("bruno-2", "Bruno", "40.00"),
        ],
      }),
    ]);

    expect(linhas).toHaveLength(2);
  });

  it("quem consumiu aparece mesmo sem ter lancado o caixa", () => {
    // Sao 60 pessoas na empresa e 20 que fecham o caixa: as outras 40 so
    // existem nesta lista.
    const linhas = montarConsumoPorPessoa([
      turno({
        nome_funcionario: "Ana (gerente)",
        consumos: [comeu("camila", "Camila", "15.00")],
      }),
    ]);

    expect(linhas.map((l) => l.nome)).toEqual(["Camila"]);
  });

  it("por nome, quando a pergunta e achar alguem na lista", () => {
    // Com 60 pessoas, procurar uma pelo tamanho da barra e impossivel — e
    // conferir o desconto de alguem e uma pergunta tao comum quanto "quem
    // consumiu mais".
    const linhas = montarConsumoPorPessoa(
      [
        turno({
          consumos: [
            comeu("z", "Zuleide", "90.00"),
            comeu("a", "Ágata", "5.00"),
            comeu("c", "Camila", "40.00"),
          ],
        }),
      ],
      "NOME",
    );

    // Ordem trocada em relacao a do valor (Zuleide, Camila, Ágata), e o
    // acento nao joga ninguem para o fim da lista.
    expect(linhas.map((l) => l.nome)).toEqual(["Ágata", "Camila", "Zuleide"]);
  });

  it("turno sem consumo nao vira linha", () => {
    expect(montarConsumoPorPessoa([turno()])).toEqual([]);
  });

  it("consumo zerado nao conta", () => {
    const linhas = montarConsumoPorPessoa([
      turno({ consumos: [comeu("ana", "Ana", "0.00")] }),
    ]);

    expect(linhas).toEqual([]);
  });
});
