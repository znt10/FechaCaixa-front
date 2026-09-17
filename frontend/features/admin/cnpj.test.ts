import { describe, expect, it } from "vitest";

import { cnpjCompleto, mascararCnpj, somenteDigitos } from "./cnpj";

/**
 * A mascara do CNPJ no cadastro da loja.
 *
 * O backend normaliza o que chegar — pontuado ou cru, tanto faz. A mascara
 * nao existe para ele, e sim para a gerente conferir contra o contrato, onde
 * o CNPJ esta pontuado. Comparar "11222333000181" com "11.222.333/0001-81" a
 * olho e onde se erra um digito e a nota fiscal da loja errada.
 */
describe("mascararCnpj", () => {
  it("pontua o CNPJ inteiro", () => {
    expect(mascararCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("vai pontuando enquanto a pessoa digita", () => {
    expect(mascararCnpj("15")).toBe("15");
    expect(mascararCnpj("151")).toBe("15.1");
    expect(mascararCnpj("15105")).toBe("15.105");
    expect(mascararCnpj("151053")).toBe("15.105.3");
    expect(mascararCnpj("11222333")).toBe("11.222.333");
    expect(mascararCnpj("112223330")).toBe("11.222.333/0");
    expect(mascararCnpj("112223330001")).toBe("11.222.333/0001");
    expect(mascararCnpj("1122233300018")).toBe("11.222.333/0001-8");
  });

  it("aceita o CNPJ colado ja pontuado do contrato", () => {
    expect(mascararCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });

  it("ignora letra e espaco, que e o que vem colado de PDF e WhatsApp", () => {
    expect(mascararCnpj(" CNPJ 11.222.333/0001-81 ")).toBe("11.222.333/0001-81");
  });

  it("para no decimo quarto digito — digitar a mais nao empurra o resto", () => {
    expect(mascararCnpj("112223330001819999")).toBe("11.222.333/0001-81");
  });

  it("campo vazio continua vazio: o CNPJ e opcional", () => {
    expect(mascararCnpj("")).toBe("");
  });

  it("apagar tudo nao deixa pontuacao orfa para tras", () => {
    // O onChange recebe o que sobrou depois do backspace; se a mascara
    // devolvesse "15." aqui, o proximo backspace apagaria o ponto e a mascara
    // o poria de volta — o campo travaria em "15." para sempre.
    expect(mascararCnpj("15.")).toBe("15");
    expect(mascararCnpj(".")).toBe("");
  });
});

describe("cnpjCompleto", () => {
  it("os catorze digitos", () => {
    expect(cnpjCompleto("11.222.333/0001-81")).toBe(true);
  });

  it("faltando um digito ainda nao vale — o backend recusaria", () => {
    expect(cnpjCompleto("11.222.333/0001-8")).toBe(false);
  });

  it("vazio nao e incompleto, e ausente: o campo e opcional", () => {
    expect(cnpjCompleto("")).toBe(false);
  });
});

describe("somenteDigitos", () => {
  it("e o que vai para o backend e para a comparacao com o XML da nota", () => {
    expect(somenteDigitos("11.222.333/0001-81")).toBe("11222333000181");
  });
});
