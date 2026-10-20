import { describe, expect, it } from "vitest";

import { naOrdem, ordenarEmpresas } from "./ordem-da-plataforma";
import type { EmpresaDaPlataforma } from "./services/mensalidade";

const empresa = (
  id: string,
  nome: string,
  situacao: EmpresaDaPlataforma["situacao"] = "ISENTA",
  paga_ate: string | null = null,
) => ({ id, nome, situacao, paga_ate }) as EmpresaDaPlataforma;

/**
 * A ordem da lista da Plataforma.
 *
 * A lista se reordenava sozinha por situacao: o dono desmarcava "Isenta" da ZNT
 * e ela pulava para outro lugar debaixo do ponteiro. Agora a ordem so muda
 * quando ele pede, no seletor do topo.
 */
describe("ordenar as empresas", () => {
  const empresas = [
    empresa("z", "ZNT", "ATRASADA", "2026-10-01"),
    empresa("p", "Pauliceia", "ISENTA", null),
    empresa("a", "Ângela Doces", "AGUARDANDO", "2026-11-05"),
    empresa("b", "Bolos da Vila", "BLOQUEADA", "2026-09-01"),
  ];

  it("por nome, de A a Z, com acento no lugar certo", () => {
    expect(ordenarEmpresas(empresas, "NOME")).toEqual(["a", "b", "p", "z"]);
  });

  it("por situacao, quem precisa de atencao primeiro", () => {
    expect(ordenarEmpresas(empresas, "SITUACAO")).toEqual(["a", "b", "z", "p"]);
  });

  it("por paga ate, o vencimento mais antigo primeiro e sem data no fim", () => {
    expect(ordenarEmpresas(empresas, "PAGA_ATE")).toEqual(["b", "z", "a", "p"]);
  });
});

describe("a lista na ordem travada", () => {
  it("nao se mexe quando a situacao de uma empresa muda", () => {
    const ordem = ["a", "p", "z"];
    // A ZNT perdeu a isencao e ficou atrasada: por situacao ela subiria.
    const depois = [
      empresa("z", "ZNT", "ATRASADA"),
      empresa("a", "Ângela Doces"),
      empresa("p", "Pauliceia"),
    ];

    expect(naOrdem(depois, ordem).map((e) => e.id)).toEqual(["a", "p", "z"]);
  });

  it("empresa nova entra no fim, sem embaralhar as outras", () => {
    const ordem = ["p", "z"];
    const depois = [
      empresa("z", "ZNT"),
      empresa("n", "Nova Padaria"),
      empresa("p", "Pauliceia"),
    ];

    expect(naOrdem(depois, ordem).map((e) => e.id)).toEqual(["p", "z", "n"]);
  });
});
