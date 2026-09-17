import { describe, expect, it } from "vitest";

import {
  linhaEditavelDoDesperdicio,
  montarDesperdiciosDoTurno,
} from "./desperdicio-do-turno";
import type { DesperdicioLancado, Salgado } from "./services/fechamentos";

const salgado = (id: string, nome: string, categoriaNome = "Salgados grande"): Salgado => ({
  id,
  nome,
  ativo: true,
  categoria: `cat-${categoriaNome}`,
  categoria_nome: categoriaNome,
  categoria_ativo: true,
});

const catalogo: Salgado[] = [
  salgado("id-coxinha", "Coxinha"),
  salgado("id-kibe", "Kibe"),
];

const linha = (chave: number, salgadoId: string, quantidade: string) => ({
  chave,
  salgadoId,
  quantidade,
});

describe("montarDesperdiciosDoTurno", () => {
  it("transforma as linhas preenchidas no payload", () => {
    const r = montarDesperdiciosDoTurno(
      [linha(1, "id-coxinha", "8"), linha(2, "id-kibe", "3")],
      catalogo,
    );

    expect(r).toEqual({
      ok: true,
      desperdicios: [
        { salgado: "id-coxinha", quantidade: 8 },
        { salgado: "id-kibe", quantidade: 3 },
      ],
    });
  });

  it("ignora a linha em branco", () => {
    const r = montarDesperdiciosDoTurno(
      [linha(1, "id-coxinha", "8"), linha(2, "", "")],
      catalogo,
    );

    expect(r).toEqual({
      ok: true,
      desperdicios: [{ salgado: "id-coxinha", quantidade: 8 }],
    });
  });

  it("recusa item que nao esta no catalogo", () => {
    const r = montarDesperdiciosDoTurno([linha(1, "id-pastel", "2")], catalogo);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("catálogo");
  });

  it("recusa item selecionado sem quantidade", () => {
    const r = montarDesperdiciosDoTurno([linha(1, "id-coxinha", "")], catalogo);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("Coxinha");
  });

  it("recusa quantidade zero", () => {
    const r = montarDesperdiciosDoTurno([linha(1, "id-coxinha", "0")], catalogo);

    expect(r.ok).toBe(false);
  });

  it("explica quando o catalogo esta vazio", () => {
    const r = montarDesperdiciosDoTurno([linha(1, "id-coxinha", "2")], []);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("catálogo");
  });

  it("recusa quantidade nao numerica", () => {
    const r = montarDesperdiciosDoTurno([linha(1, "id-coxinha", "abc")], catalogo);

    expect(r.ok).toBe(false);
  });

  it("recusa quantidade decimal", () => {
    const r = montarDesperdiciosDoTurno([linha(1, "id-coxinha", "2.5")], catalogo);

    expect(r.ok).toBe(false);
  });

  it("aceita duas linhas do mesmo item", () => {
    const r = montarDesperdiciosDoTurno(
      [linha(1, "id-coxinha", "3"), linha(2, "id-coxinha", "5")],
      catalogo,
    );

    expect(r).toEqual({
      ok: true,
      desperdicios: [
        { salgado: "id-coxinha", quantidade: 3 },
        { salgado: "id-coxinha", quantidade: 5 },
      ],
    });
  });

  // O catalogo tem dois niveis PRECISAMENTE porque o nome repete entre
  // categorias: "Coxinha" existe em "Salgados grande" e em "Salgados mini".
  // Resolver a linha pelo nome (como este modulo fazia antes) sempre
  // devolvia o primeiro item daquele nome — e a familia "mini" nunca era
  // alcancada pelo formulario. Resolvendo pelo id, a linha vai exatamente
  // para a categoria que a loja escolheu no seletor.
  it("uma linha de 'Coxinha' escolhida na categoria mini nao vira a coxinha grande", () => {
    const catalogoComNomeRepetido: Salgado[] = [
      salgado("id-coxinha-grande", "Coxinha", "Salgados grande"),
      salgado("id-coxinha-mini", "Coxinha", "Salgados mini"),
    ];

    const r = montarDesperdiciosDoTurno(
      [linha(1, "id-coxinha-mini", "8")],
      catalogoComNomeRepetido,
    );

    expect(r).toEqual({
      ok: true,
      desperdicios: [{ salgado: "id-coxinha-mini", quantidade: 8 }],
    });
  });
});

describe("linhaEditavelDoDesperdicio", () => {
  const desperdicioLancado = (
    salgadoId: string,
    nome: string,
    quantidade: number,
    categoriaNome = "Salgados grande",
  ): DesperdicioLancado => ({
    id: "d-1",
    salgado: salgadoId,
    nome,
    categoria_nome: categoriaNome,
    quantidade,
  });

  it("traduz a linha do servidor para o formato editavel do formulario, pelo id", () => {
    const editavel = linhaEditavelDoDesperdicio(
      desperdicioLancado("id-coxinha", "Coxinha", 8),
      7,
    );

    expect(editavel).toEqual({ chave: 7, salgadoId: "id-coxinha", quantidade: "8" });
  });

  it("a correcao preserva a linha: reidratar e remontar devolve o mesmo salgado e quantidade", () => {
    // E o caminho que quebrava antes deste conserto: a loja abre a correcao,
    // o formulario reidrata a linha, e o envio remonta o payload a partir
    // dela. Se a viagem de ida e volta perder algo, a loja corrige o PIX e o
    // desperdicio some (ou troca de categoria) sem aviso.
    const doServidor = desperdicioLancado("id-coxinha", "Coxinha", 8);
    const editavel = linhaEditavelDoDesperdicio(doServidor, 1);

    const remontado = montarDesperdiciosDoTurno([editavel], catalogo);

    expect(remontado).toEqual({
      ok: true,
      desperdicios: [{ salgado: "id-coxinha", quantidade: 8 }],
    });
  });

  it("reidratar 'Coxinha mini' nao vira 'Coxinha grande' na correcao", () => {
    const catalogoComNomeRepetido: Salgado[] = [
      salgado("id-coxinha-grande", "Coxinha", "Salgados grande"),
      salgado("id-coxinha-mini", "Coxinha", "Salgados mini"),
    ];
    const doServidor = desperdicioLancado(
      "id-coxinha-mini",
      "Coxinha",
      8,
      "Salgados mini",
    );
    const editavel = linhaEditavelDoDesperdicio(doServidor, 1);

    const remontado = montarDesperdiciosDoTurno([editavel], catalogoComNomeRepetido);

    expect(remontado).toEqual({
      ok: true,
      desperdicios: [{ salgado: "id-coxinha-mini", quantidade: 8 }],
    });
  });
});
