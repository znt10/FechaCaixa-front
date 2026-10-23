import { describe, expect, it, vi } from "vitest";

import {
  avisoDeParado,
  haQuanto,
  origemDaConta,
  textoDaFaixa,
} from "./situacao-da-pluggy";
import type { ConexaoPluggy, PainelDaPluggy } from "./services/pluggy";

const agora = new Date("2026-10-18T14:00:00Z");

const conexao = (nome: string, estado: ConexaoPluggy["estado"]): ConexaoPluggy => ({
  id: nome,
  empresa: { id: nome, nome },
  email: "",
  estado,
  client_id: "",
  segredo_salvo_em: null,
  item_ids: "",
  conectada_em: null,
  ultima_busca_ok_em: null,
  ultimo_erro: "",
  contas: [],
});

const painel = (conexoes: ConexaoPluggy[]): PainelDaPluggy => ({
  contadores: { funcionando: 0, caidas: 0, configurando: 0 },
  conexoes,
});

describe("haQuanto", () => {
  it("diz há quanto tempo", () => {
    expect(haQuanto("2026-10-18T09:00:00Z", agora)).toBe("há 5 h");
    expect(haQuanto("2026-10-18T13:55:00Z", agora)).toBe("há 5 min");
    expect(haQuanto("2026-10-16T13:00:00Z", agora)).toBe("há 2 dias");
  });
});

describe("origemDaConta", () => {
  it("separa automática de por arquivo", () => {
    expect(
      origemDaConta({ origem: "PLUGGY", atualizado_em: "2026-10-18T09:00:00Z" }, agora),
    ).toBe("Automático (Pluggy) · atualizado há 5 h");
    expect(origemDaConta({ origem: "ARQUIVO", atualizado_em: null }, agora)).toBe("Por arquivo");
  });
});

describe("textoDaFaixa", () => {
  it("fala de uma, de duas e de nenhuma caída", () => {
    expect(
      textoDaFaixa(painel([conexao("Delícias Salgados", "COM_ERRO"), conexao("B", "ATIVA")])),
    ).toBe("A Pluggy da Delícias Salgados caiu — ver");
    expect(
      textoDaFaixa(painel([conexao("A", "COM_ERRO"), conexao("B", "COM_ERRO")])),
    ).toBe("A Pluggy de 2 empresas caiu — ver");
    expect(textoDaFaixa(painel([conexao("A", "ATIVA")]))).toBeNull();
  });

  it("conta empresas, e não conexões: duas caídas da mesma empresa são uma", () => {
    const outraDaMesma = { ...conexao("Delícias Salgados", "COM_ERRO"), id: "segunda" };
    expect(
      textoDaFaixa(painel([conexao("Delícias Salgados", "COM_ERRO"), outraDaMesma])),
    ).toBe("A Pluggy da Delícias Salgados caiu — ver");
    expect(
      textoDaFaixa(
        painel([conexao("Delícias Salgados", "COM_ERRO"), outraDaMesma, conexao("B", "COM_ERRO")]),
      ),
    ).toBe("A Pluggy de 2 empresas caiu — ver");
  });
});

describe("avisoDeParado", () => {
  const conta = (atualizado_em: string | null, origem: "PLUGGY" | "ARQUIVO" = "PLUGGY") => ({
    origem,
    atualizado_em,
  });

  it("só passa de 48 h", () => {
    expect(avisoDeParado([conta("2026-10-16T14:00:01Z")], agora)).toBeNull();
    expect(avisoDeParado([conta("2026-10-16T17:05:00Z")], agora)).toBeNull();
    expect(avisoDeParado([conta("2026-10-16T17:05:00Z")], new Date("2026-10-18T18:06:00Z"))).toBe(
      "A conexão com o banco não atualiza desde 16/10 às 14:05",
    );
  });

  it("usa a conta Pluggy mais antiga e ignora arquivo", () => {
    expect(
      avisoDeParado(
        [conta("2026-10-10T00:00:00Z", "ARQUIVO"), conta("2026-10-17T00:00:00Z"), conta("2026-10-16T17:05:00Z")],
        new Date("2026-10-18T18:06:00Z"),
      ),
    ).toBe("A conexão com o banco não atualiza desde 16/10 às 14:05");
    expect(avisoDeParado([conta("2026-10-01T00:00:00Z", "ARQUIVO")], agora)).toBeNull();
    expect(avisoDeParado([], agora)).toBeNull();
  });

  it("escreve meia-noite como 00, e não 24", () => {
    // 03:05 UTC é 00:05 em Brasília.
    expect(avisoDeParado([conta("2026-10-16T03:05:00Z")], new Date("2026-10-18T18:06:00Z"))).toBe(
      "A conexão com o banco não atualiza desde 16/10 às 00:05",
    );
  });

  it("não depende do separador que o navegador põe entre a data e a hora", () => {
    // Há versões do ICU que escrevem "16/10 14:05", sem a vírgula.
    const semVirgula = vi.spyOn(Date.prototype, "toLocaleString").mockReturnValue("16/10 14:05");
    try {
      expect(
        avisoDeParado([conta("2026-10-16T17:05:00Z")], new Date("2026-10-18T18:06:00Z")),
      ).toBe("A conexão com o banco não atualiza desde 16/10 às 14:05");
    } finally {
      semVirgula.mockRestore();
    }
  });
});
