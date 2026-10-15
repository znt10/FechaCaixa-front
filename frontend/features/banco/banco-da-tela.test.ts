import { describe, expect, it } from "vitest";

import type { GrupoDeDespesa } from "@/features/admin/services/notas";

import {
  arvoreDoBloco,
  avisoDePendentes,
  classificacaoDoValor,
  filtrarOpcoes,
  escolhasIniciais,
  filtroDoResumo,
  frasesDaImportacao,
  intervaloDasEscolhas,
  coberturaDasLojas,
  contasPorLoja,
  linhaDaTabela,
  mudancaDaConta,
  montarFiltroDoExtrato,
  mostrarAbasDoBanco,
  opcoesDaLinha,
  rotuloDoSaldo,
  saldoDoResumo,
  separarOsExtratos,
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
  automatica: false,
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

const INICIAIS = escolhasIniciais("2026-10-14");

describe("filtros", () => {
  it("abre no mês de hoje, na fila de trabalho, e a página 1 não manda page", () => {
    expect(montarFiltroDoExtrato(INICIAIS)).toEqual({
      de: "2026-10-01",
      ate: "2026-10-31",
      pendente: "true",
    });
  });

  it("o resumo ignora a fila de trabalho e a página", () => {
    const escolhas = { ...INICIAIS, loja: "loja-a", pagina: 3 };
    expect(filtroDoResumo(escolhas)).toEqual({
      loja: "loja-a",
      de: "2026-10-01",
      ate: "2026-10-31",
    });
    expect(montarFiltroDoExtrato(escolhas)).toEqual({
      loja: "loja-a",
      de: "2026-10-01",
      ate: "2026-10-31",
      pendente: "true",
      page: 3,
    });
  });

  it("trocar filtro volta para a primeira página", () => {
    const naQuatro = { ...INICIAIS, pagina: 4 };
    expect(trocarDeFiltro(naQuatro, { loja: "x" }).pagina).toBe(1);
  });
});

describe("o período", () => {
  it("dia é o próprio dia", () => {
    expect(intervaloDasEscolhas({ ...INICIAIS, granularidade: "DIA" })).toEqual({
      de: "2026-10-14",
      ate: "2026-10-14",
    });
  });

  it("semana vai de segunda a domingo", () => {
    expect(intervaloDasEscolhas({ ...INICIAIS, granularidade: "SEMANA" })).toEqual({
      de: "2026-10-12",
      ate: "2026-10-18",
    });
  });

  it("mês segue o mês escolhido, e não o dia", () => {
    expect(intervaloDasEscolhas({ ...INICIAIS, mes: "2026-02" })).toEqual({
      de: "2026-02-01",
      ate: "2026-02-28",
    });
  });
});

describe("o total", () => {
  it("o saldo é o que entrou menos o que saiu, sem erro de float", () => {
    expect(saldoDoResumo({ entradas: "8245.16", saidas: "-8346.47" })).toBe(-101.31);
  });

  it("o rótulo acompanha o período", () => {
    expect(rotuloDoSaldo("MES")).toBe("SALDO DO MÊS");
    expect(rotuloDoSaldo("SEMANA")).toBe("SALDO DA SEMANA");
  });

  it("o aviso conta no singular e no plural", () => {
    expect(avisoDePendentes(1)).toBe("1 movimentação para classificar");
    expect(avisoDePendentes(78)).toBe("78 movimentações para classificar");
  });
});

describe("a árvore do resumo", () => {
  const categoria = (nome: string, valor: string, quantidade = 1) => ({
    id: nome,
    nome,
    valor,
    quantidade,
  });

  it("junta os elementos pelo grupo, com o total do grupo", () => {
    const arvore = arvoreDoBloco({
      categorias: [
        categoria("Impostos > Simples Nacional", "-2436.60"),
        categoria("Pessoal > Vale-transporte", "-470.21", 3),
        categoria("Pessoal > Uniforme", "-217.54", 2),
      ],
    });
    expect(arvore.map((no) => [no.nome, no.valor, no.quantidade])).toEqual([
      ["Impostos", -2436.6, 1],
      ["Pessoal", -687.75, 5],
    ]);
    expect(arvore[1].filhos.map((folha) => folha.nome)).toEqual(["Vale-transporte", "Uniforme"]);
  });

  it("ordena pelo tamanho, sem olhar o sinal", () => {
    const entradas = arvoreDoBloco({
      categorias: [categoria("Estorno", "12.00"), categoria("Vendas", "6939.19")],
    });
    expect(entradas.map((no) => no.nome)).toEqual(["Vendas", "Estorno"]);

    const saidas = arvoreDoBloco({
      categorias: [
        categoria("Compras > Bebidas", "-77.52"),
        categoria("Operacional > Aluguel", "-99.99"),
      ],
    });
    expect(saidas.map((no) => no.nome)).toEqual(["Operacional", "Compras"]);
  });

  it("o que não tem grupo fica solto na raiz", () => {
    const arvore = arvoreDoBloco({
      categorias: [categoria("Sem categoria", "-10.00"), categoria("Pessoal > Uniforme", "-5.00")],
    });
    expect(arvore.map((no) => [no.nome, no.filhos.length])).toEqual([
      ["Sem categoria", 0],
      ["Pessoal", 1],
    ]);
  });

  it("o total do grupo não acumula erro de float", () => {
    const [grupo] = arvoreDoBloco({
      categorias: [categoria("G > A", "0.10"), categoria("G > B", "0.20")],
    });
    expect(grupo.valor).toBe(0.3);
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

  it("numa saída não aparece recebimento; numa entrada não aparece pagamento", () => {
    const rotulos = (valor: string) =>
      opcoesDaLinha(transacao({ valor }), PLANO, CATEGORIAS).map((grupo) => grupo.rotulo);

    expect(rotulos("-10.00")).toEqual(["Pagamento · Operacional", "Transferência"]);
    expect(rotulos("10.00")).toEqual(["Recebimento", "Transferência"]);
  });

  it("o que já foi lançado no outro sentido continua, só ele, no fim", () => {
    const estorno = transacao({
      valor: "50.00",
      tipo: "PAGAMENTO",
      elemento: { id: "aluguel", nome: "Aluguel", grupo: "Operacional", ativo: true },
    });
    const grupos = opcoesDaLinha(estorno, PLANO, CATEGORIAS);

    expect(grupos.map((grupo) => grupo.rotulo)).toEqual([
      "Recebimento",
      "Transferência",
      "Pagamento · Operacional",
    ]);
    expect(grupos.at(-1)?.opcoes).toEqual([{ valor: "PAGAMENTO:aluguel", nome: "Aluguel" }]);
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

  it("marca a entrada que virou venda sozinha", () => {
    expect(linhaDaTabela(transacao({ valor: "35.00", automatica: true })).automatica).toBe(
      "Entrou como venda sozinha",
    );
    expect(linhaDaTabela(transacao()).automatica).toBeNull();
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
        vendas: 0,
        periodo_de: null,
        periodo_ate: null,
      }),
    ).toEqual([
      "2 movimentações novas",
      "41 já existiam e não entraram de novo",
      "1 transferência entre lojas achada",
    ]);
  });

  it("diz quantas entradas viraram venda sozinhas", () => {
    expect(
      frasesDaImportacao({
        arquivo: "picpay.csv",
        novas: 40,
        repetidas: 0,
        pareadas: 0,
        classificadas: 3,
        vendas: 30,
        periodo_de: null,
        periodo_ate: null,
      }),
    ).toEqual([
      "40 movimentações novas",
      "3 classificadas pelo que você já tinha respondido",
      "30 entradas marcadas como venda",
    ]);
  });

  it("separa o que não é OFX nem CSV antes de enviar", () => {
    const { extratos, descartados } = separarOsExtratos([
      { name: "outubro.OFX" },
      { name: "extrato-2026-09-14-2026-10-13.csv" },
      { name: "extrato.pdf" },
    ]);
    expect(extratos.map((a) => a.name)).toEqual(["outubro.OFX", "extrato-2026-09-14-2026-10-13.csv"]);
    expect(descartados.map((d) => d.arquivo)).toEqual(["extrato.pdf"]);
    expect(descartados[0].motivo).toContain("CSV do PicPay");
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

describe("a busca do seletor", () => {
  const grupos = [
    { rotulo: "Pagamento · Operacional", opcoes: [{ valor: "P:agua", nome: "Água" }, { valor: "P:luz", nome: "Energia" }] },
    { rotulo: "Pagamento · Pessoal", opcoes: [{ valor: "P:sal", nome: "Salário" }] },
  ];

  it("acha sem acento e sem caixa, e tira o grupo que ficou vazio", () => {
    expect(filtrarOpcoes(grupos, "AGUA")).toEqual([
      { rotulo: "Pagamento · Operacional", opcoes: [{ valor: "P:agua", nome: "Água" }] },
    ]);
  });

  it("o nome do grupo traz o grupo inteiro", () => {
    expect(filtrarOpcoes(grupos, "pessoal")).toEqual([grupos[1]]);
  });

  it("busca vazia devolve tudo", () => {
    expect(filtrarOpcoes(grupos, "  ")).toBe(grupos);
  });
});

describe("editar uma conta", () => {
  const conta = { banco: "PICPAY" as const, agencia: "", numero: "106531006", apelido: "" };

  it("manda só o que mudou, aparado", () => {
    expect(mudancaDaConta(conta, { ...conta, numero: " 106539100-5 " })).toEqual({
      mudanca: { numero: "106539100-5" },
      erro: null,
    });
  });

  it("nada mudou, nada vai", () => {
    expect(mudancaDaConta(conta, { ...conta, apelido: "  " })).toEqual({ mudanca: null, erro: null });
  });

  it("número vazio é recusado antes de ir ao servidor", () => {
    expect(mudancaDaConta(conta, { ...conta, numero: "  " }).erro).toBe(
      "O número da conta não pode ficar vazio.",
    );
  });
});

describe("contas por loja", () => {
  const conta = (id: string, lojaId: string, ativo = true) => ({
    id,
    loja: { id: lojaId, nome_loja: lojaId },
    banco: "NUBANK" as const,
    banco_nome: "Nubank",
    agencia: "",
    numero: id,
    apelido: "",
    ativo,
  });
  const lojas = [
    { id: "limao", nome_loja: "Limão" },
    { id: "itaberaba", nome_loja: "Itaberaba" },
    { id: "lapa", nome_loja: "Lapa" },
  ];

  it("mostra toda loja, inclusive a que não tem conta", () => {
    const linhas = contasPorLoja(lojas, [conta("1", "limao")]);
    expect(linhas.map((l) => [l.loja.nome_loja, l.contas.length])).toEqual([
      ["Limão", 1],
      ["Itaberaba", 0],
      ["Lapa", 0],
    ]);
  });

  it("a conta de uma loja fora da lista não some", () => {
    const linhas = contasPorLoja(lojas, [conta("9", "fechada")]);
    expect(linhas.at(-1)?.loja.id).toBe("fechada");
  });

  it("ativas primeiro dentro da loja", () => {
    const [limao] = contasPorLoja(lojas, [conta("velha", "limao", false), conta("nova", "limao")]);
    expect(limao.contas.map((c) => c.id)).toEqual(["nova", "velha"]);
  });

  it("a cobertura só conta conta ativa", () => {
    const linhas = contasPorLoja(lojas, [conta("1", "limao"), conta("2", "itaberaba", false)]);
    expect(coberturaDasLojas(linhas)).toEqual({ comConta: 1, total: 3, texto: "1 de 3 lojas com conta" });
  });
});
