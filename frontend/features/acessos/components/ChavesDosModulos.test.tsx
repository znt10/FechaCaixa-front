import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChavesDosModulos } from "./ChavesDosModulos";

const html = (comprovantes: boolean) =>
  renderToStaticMarkup(
    <ChavesDosModulos
      modulos={{ notas: false, banco: false, comprovantes, comprovantes_pessoais: false }}
      ocupado={false}
      onMudar={() => {}}
    />,
  );

const chaveDoCpf = (texto: string) =>
  texto.match(/<input[^>]*name="comprovantes_pessoais"[^>]*>/)?.[0] ?? "";

describe("as chaves dos módulos", () => {
  it("tem a chave dos comprovantes pessoais (CPF)", () => {
    expect(html(true)).toContain("Comprovantes pessoais (CPF)");
  });

  it("o CPF só liga com Comprovantes ligado", () => {
    expect(chaveDoCpf(html(false))).toContain("disabled");
    expect(chaveDoCpf(html(true))).not.toContain("disabled");
  });
});
