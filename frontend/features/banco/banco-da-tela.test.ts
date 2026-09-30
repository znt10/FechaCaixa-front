import { describe, expect, it } from "vitest";

import type { GrupoDeDespesa } from "@/features/admin/services/notas";

import {
  classificacaoDoValor,
  ESCOLHAS_INICIAIS,
  filtroDoResumo,
  frasesDaImportacao,
  linhaDaTabela,
  montarFiltroDoExtrato,
  mostrarAbasDoBanco,
  opcoesDaLinha,
  separarOsOfx,
  trocarDeFiltro,
  valorComSinal,
  valorDaClassificacao,
} from "./banco-da-tela";
import type { CategoriaDeMovimento, TransacaoBancaria } from "./services/banco";

const CONTA_A = {
  id: "cb-a",
  loja: { id: "loja-a", nome_loja: "Loja A" },
  banco: "SANTANDER" as const,
  banco_nome: "Santander",
  numero: "12345-6",
  apelido: "",
};

const CONTA_B = {
  ...CONTA_A,
  id: "cb-b",
  loja: { id: "loja-b", nome_loja: "Loja B" },
  banco: "INTER" as const,
  banco_nome: "Inter",
  numero: "999",
};

const transacao = (mudanca: Partial<TransacaoBancaria> = {}): TransacaoBancaria => ({
  id: "t1",
  data: "2026-10-05",
  valor: "-500.00",
  descricao: "PIX ENVIADO",
  conta_bancaria: CONTA_A,
  tipo: null,
  tipo_nome: null,
  elemento: null,
  categoria: null,
  par: null,
  classificada: false,
  ...mudanca,
});

const PLANO: GrupoDeDespesa[] = [
  {
    id: "g1",
    nome: "Operacional",
    ativo: true,
    elementos: [
      { id: "aluguel", nome: "Aluguel", grupo: "Operacional", ativo: true },
      { id: "velho", nome: "Gás antigo", grupo: "Operacional", ativo: false },
    ],
  },
];

const CATEGORIAS: CategoriaDeMovimento[] = [
  { id: "entre", tipo: "TRANSFERENCIA", tipo_nome: "Transferência", nome: "Entre lojas", ativo: true, entre_lojas: true },
  { id: "socio", tipo: "TRANSFERENCIA", tipo_nome: "Transferência", nome: "Retirada de sócio", ativo: true, entre_lojas: false },
  { id: "vendas", tipo: "RECEBIMENTO", tipo_nome: "Recebimento", nome: "Vendas", ativo: true, entre_lojas: false },
  { id: "morta", tipo: "RECEBIMENTO", tipo_nome: "Recebimento", nome: "Aluguel de sala", ativo: false, entre_lojas: false },
];

describe("filtros", () => {
  it("abre na fila de trabalho, e a página 1 não manda page", () => {
    expect(montarFiltroDoExtrato(ESCOLHAS_INICIAIS)).toEqual({ pendente: "true" });
  });

  it("o resumo ignora a fila de trabalho e a página", () => {
    const escolhas = { ...ESCOLHAS_INICIAIS, loja: "loja-a", de: "2026-10-01", pagina: 3 };
    expect(filtroDoResumo(escolhas)).toEqual({ loja: "loja-a", de: "2026-10-01" });
    expect(montarFiltroDoExtrato(escolhas)).toEqual({
      loja: "loja-a",
      de: "2026-10-01",
      pendente: "true",
      page: 3,
    });
  });

  it("trocar filtro volta para a primeira página", () => {
    const naQuatro = { ...ESCOLHAS_INICIAIS, pagina: 4 };
    expect(trocarDeFiltro(naQuatro, { loja: "x" }).pagina).toBe(1);
  });
});

describe("a classificação num seletor só", () => {
  it("vai e volta entre a linha e o corpo do PATCH", () => {
    expect(valorDaClassificacao(transacao())).toBe("");
    expect(classificacaoDoValor("")).toEqual({ tipo: null, elemento: null, categoria: null });

    const paga = transacao({
      tipo: "PAGAMENTO",
      elemento: { id: "aluguel", nome: "Aluguel", grupo: "Operacional", ativo: true },
    });
    expect(valorDaClassificacao(paga)).toBe("PAGAMENTO:aluguel");
    expect(classificacaoDoValor("PAGAMENTO:aluguel")).toEqual({
      tipo: "PAGAMENTO",
      elemento: "aluguel",
      categoria: null,
    });
    expect(classificacaoDoValor("RECEBIMENTO:vendas")).toEqual({
      tipo: "RECEBIMENTO",
      elemento: null,
      categoria: "vendas",
    });
  });

  it("numa saída, pagamento vem primeiro; numa entrada, recebimento", () => {
    const rotulos = (valor: string) =>
      opcoesDaLinha(transacao({ valor }), PLANO, CATEGORIAS).map((grupo) => grupo.rotulo);

    expect(rotulos("-10.00")).toEqual(["Pagamento · Operacional", "Transferência", "Recebimento"]);
    expect(rotulos("10.00")).toEqual(["Recebimento", "Transferência", "Pagamento · Operacional"]);
  });

  it("esconde o que foi desativado, menos o que já está lançado na linha", () => {
    const nomes = (linha: TransacaoBancaria) =>
      opcoesDaLinha(linha, PLANO, CATEGORIAS).flatMap((grupo) => grupo.opcoes.map((o) => o.nome));

    expect(nomes(transacao())).not.toContain("Gás antigo");
    expect(nomes(transacao())).not.toContain("Aluguel de sala");

    const lancada = transacao({
      tipo: "RECEBIMENTO",
      categoria: { id: "morta", nome: "Aluguel de sala", tipo: "RECEBIMENTO", entre_lojas: false },
    });
    expect(nomes(lancada)).toContain("Aluguel de sala (fora da lista)");
  });

  it("uma linha com tipo e sem categoria não se passa por outra opção", () => {
    const orfa = transacao({ tipo: "TRANSFERENCIA", categoria: null });
    const grupos = opcoesDaLinha(orfa, PLANO, CATEGORIAS);

    expect(grupos[0].opcoes).toEqual([
      { valor: "TRANSFERENCIA:", nome: "Transferência sem categoria" },
    ]);
  });
});

describe("a linha da tabela", () => {
  it("mostra data brasileira, lugar e valor com sinal", () => {
    const linha = linhaDaTabela(transacao());
    expect(linha.data).toBe("05/10/2026");
    expect(linha.lugar).toBe("Loja A · Santander 12345-6");
    expect(linha.valor).toBe("− R$ 500,00");
    expect(linha.entrada).toBe(false);
    expect(linha.par).toBeNull();
  });

  it("diz com quem é a transferência entre lojas", () => {
    const linha = linhaDaTabela(
      transacao({ par: { id: "t2", data: "2026-10-05", conta_bancaria: CONTA_B } }),
    );
    expect(linha.par).toBe("Transferência com Loja B (Inter 999)");
  });

  it("usa o apelido da conta quando há", () => {
    const linha = linhaDaTabela(
      transacao({ conta_bancaria: { ...CONTA_A, apelido: "Conta do aluguel" } }),
    );
    expect(linha.lugar).toBe("Loja A · Conta do aluguel");
  });

  it("valor com sinal nos dois sentidos", () => {
    expect(valorComSinal("1234.5")).toBe("+ R$ 1.234,50");
    expect(valorComSinal("0")).toBe("R$ 0,00");
  });
});

describe("o resultado da importação", () => {
  it("diz sempre quantas já existiam: é a prova de que não duplicou", () => {
    expect(
      frasesDaImportacao({
        arquivo: "a.ofx",
        novas: 2,
        repetidas: 41,
        pareadas: 1,
        classificadas: 0,
        periodo_de: null,
        periodo_ate: null,
      }),
    ).toEqual([
      "2 movimentações novas",
      "41 já existiam e não entraram de novo",
      "1 transferência entre lojas achada",
    ]);
  });

  it("separa o que não é OFX antes de enviar", () => {
    const { ofx, descartados } = separarOsOfx([
      { name: "outubro.OFX" },
      { name: "extrato.pdf" },
    ]);
    expect(ofx.map((a) => a.name)).toEqual(["outubro.OFX"]);
    expect(descartados[0].arquivo).toBe("extrato.pdf");
  });
});

describe("quem vê as abas do banco", () => {
  const usuario = (group: string, banco: boolean) => ({
    id: 1,
    group,
    modulos: { banco },
  });

  it("a gerência da empresa que contratou", () => {
    for (const group of ["Gerente", "Admin"]) {
      expect(
        mostrarAbasDoBanco({ usuario: usuario(group, true), carregando: false, falhou: false }),
      ).toBe(true);
    }
  });

  it("não o funcionário, nem a empresa sem o módulo", () => {
    expect(
      mostrarAbasDoBanco({ usuario: usuario("Funcionario", true), carregando: false, falhou: false }),
    ).toBe(false);
    expect(
      mostrarAbasDoBanco({ usuario: usuario("Gerente", false), carregando: false, falhou: false }),
    ).toBe(false);
  });

  it("carregando fica fora; falhou fica — quem barra é o servidor", () => {
    expect(mostrarAbasDoBanco({ carregando: true, falhou: false })).toBe(false);
    expect(mostrarAbasDoBanco({ carregando: false, falhou: true })).toBe(true);
  });
});
