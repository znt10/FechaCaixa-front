import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormularioDeGerente } from "./FormularioDeGerente";

/** Renderizado em Node puro, como LinhaDaPlataforma.test: o que se confere é
 *  o que aparece. Tirar a senha em branco do corpo é `corpoDoGerente`. */
const html = renderToStaticMarkup(
  <FormularioDeGerente rotulo="Adicionar gerente" ocupado={false} onEnviar={async () => {}} />,
);

describe("o formulário de gerente", () => {
  it("explica que a senha em branco manda o link por e-mail", () => {
    expect(html).toContain(
      "Deixe em branco para mandar por e-mail um link para a pessoa criar a própria senha.",
    );
  });

  it("pede nome e e-mail, e a senha não é obrigatória", () => {
    // A ordem dos atributos no HTML não importa: confere cada campo inteiro.
    const campo = (nome: string) =>
      html.match(new RegExp(`<input[^>]*name="${nome}"[^>]*>`))?.[0] ?? "";
    expect(campo("nome")).toContain("required");
    expect(campo("email")).toContain('type="email"');
    expect(campo("email")).toContain("required");
    expect(campo("senha")).toContain('type="password"');
    expect(campo("senha")).not.toContain("required");
  });
});
