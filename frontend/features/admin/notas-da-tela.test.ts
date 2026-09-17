import { describe, expect, it } from "vitest";

import {
  ESCOLHAS_INICIAIS,
  agruparRecusas,
  andarDePagina,
  contratouNotasFiscais,
  linhasDaTabela,
  mensagemDeErroDoEnvio,
  montarFiltroDeNotas,
  mostrarAbaDeNotas,
  opcoesDeClassificacao,
  resultadoDoLote,
  resumoDaPagina,
  resumoDoLote,
  seletorDaLinha,
  separarOsXmls,
  trocarDeFiltro,
  voltarParaPrimeiraPagina,
  type EscolhasDaTela,
} from "./notas-da-tela";
import type { GrupoDeDespesa, NotaFiscal, PaginaDeNotas } from "./services/notas";

const escolhas = (parcial: Partial<EscolhasDaTela> = {}): EscolhasDaTela => ({
  ...ESCOLHAS_INICIAIS,
  ...parcial,
});

const nota = (parcial: Partial<NotaFiscal> = {}): NotaFiscal => ({
  id: "nota-1",
  numero: "1234",
  serie: "1",
  data_emissao: "2026-09-05",
  valor_total: "1234.50",
  loja: { id: "loja-1", nome_loja: "Centro" },
  fornecedor: { id: "forn-1", razao_social: "Moinho Sul", cnpj: "98765432000188" },
  elemento: null,
  classificada: false,
  ...parcial,
});

const pagina = (parcial: Partial<PaginaDeNotas> = {}): PaginaDeNotas => ({
  count: 0,
  next: null,
  previous: null,
  results: [],
  ...parcial,
});

describe("montarFiltroDeNotas", () => {
  it("a fila de trabalho pede só as não classificadas", () => {
    expect(montarFiltroDeNotas(escolhas({ soPendentes: true }))).toEqual({
      classificada: "false",
    });
  });

  it("ver tudo é a ausência do filtro, não classificada=true", () => {
    // classificada=true traria só as JÁ classificadas — o oposto de "tudo".
    expect(montarFiltroDeNotas(escolhas({ soPendentes: false }))).toEqual({});
  });

  it("leva loja e intervalo quando a gerência escolheu", () => {
    expect(
      montarFiltroDeNotas(
        escolhas({ soPendentes: false, loja: "loja-1", de: "2026-09-01", ate: "2026-09-30" }),
      ),
    ).toEqual({ loja: "loja-1", de: "2026-09-01", ate: "2026-09-30" });
  });

  it("campo vazio não vira filtro vazio na URL", () => {
    expect(montarFiltroDeNotas(escolhas({ soPendentes: false, loja: "", de: "" }))).toEqual({});
  });

  it("a página 1 não manda page — é a mesma lista que o servidor devolve sem ele", () => {
    expect(montarFiltroDeNotas(escolhas({ soPendentes: false, pagina: 1 }))).toEqual({});
  });

  it("da página 2 em diante manda page, senão a tela repetiria as 50 primeiras", () => {
    expect(montarFiltroDeNotas(escolhas({ soPendentes: false, pagina: 3 }))).toEqual({
      page: 3,
    });
  });
});

describe("agruparRecusas", () => {
  it("junta os arquivos que caíram pelo mesmo motivo", () => {
    expect(
      agruparRecusas([
        { arquivo: "a.xml", motivo: "já foi lançada" },
        { arquivo: "b.xml", motivo: "não é uma nota fiscal" },
        { arquivo: "c.xml", motivo: "já foi lançada" },
      ]),
    ).toEqual([
      { motivo: "já foi lançada", arquivos: ["a.xml", "c.xml"] },
      { motivo: "não é uma nota fiscal", arquivos: ["b.xml"] },
    ]);
  });

  it("mantém a ordem em que os motivos apareceram no lote", () => {
    expect(
      agruparRecusas([
        { arquivo: "a.xml", motivo: "segundo" },
        { arquivo: "b.xml", motivo: "primeiro" },
      ]).map((grupo) => grupo.motivo),
    ).toEqual(["segundo", "primeiro"]);
  });

  it("nunca perde um arquivo: todo recusado aparece em algum grupo", () => {
    // Uma recusa engolida faz a gerência achar que lançou a despesa e não
    // lançou — é o pior desfecho possível desta tela.
    const recusadas = [
      { arquivo: "a.xml", motivo: "x" },
      { arquivo: "b.xml", motivo: "y" },
      { arquivo: "a.xml", motivo: "x" },
    ];
    const arquivos = agruparRecusas(recusadas).flatMap((grupo) => grupo.arquivos);
    expect(arquivos).toHaveLength(3);
    expect(arquivos).toEqual(["a.xml", "a.xml", "b.xml"]);
  });

  it("lote sem recusa nenhuma não gera grupo", () => {
    expect(agruparRecusas([])).toEqual([]);
  });
});

describe("linhasDaTabela", () => {
  it("mostra a data como a padaria escreve, e o valor em reais", () => {
    expect(linhasDaTabela([nota()])[0]).toEqual({
      id: "nota-1",
      data: "05/09/2026",
      documento: "1234 / série 1",
      fornecedor: "Moinho Sul",
      loja: "Centro",
      valor: "R$ 1.234,50",
      elementoId: "",
      elementoNome: "",
      classificada: false,
    });
  });

  it("nota já classificada leva o elemento escolhido no select", () => {
    const linha = linhasDaTabela([
      nota({
        id: "nota-2",
        elemento: { id: "elem-9", nome: "Embalagem", grupo: "Compras", ativo: true },
        classificada: true,
      }),
    ])[0];
    expect(linha.elementoId).toBe("elem-9");
    // O nome vem da nota, e não do plano de contas: é ele que a linha mostra
    // quando o plano não carrega.
    expect(linha.elementoNome).toBe("Embalagem");
    expect(linha.classificada).toBe(true);
  });

  it("valor quebrado não perde centavo na formatação", () => {
    expect(linhasDaTabela([nota({ valor_total: "0.90" })])[0].valor).toBe("R$ 0,90");
  });
});

describe("resumoDaPagina", () => {
  it("diz qual faixa está na tela, e não só o total", () => {
    const resumo = resumoDaPagina(
      pagina({ count: 312, next: "?page=3", previous: "?page=1", results: Array(50).fill(nota()) }),
      2,
    );
    expect(resumo.texto).toBe("Mostrando 51 a 100 de 312 notas");
    expect(resumo.temAnterior).toBe(true);
    expect(resumo.temProxima).toBe(true);
  });

  it("a última página fecha na contagem real, não em múltiplo de 50", () => {
    const resumo = resumoDaPagina(
      pagina({ count: 112, next: null, previous: "?page=2", results: Array(12).fill(nota()) }),
      3,
    );
    expect(resumo.texto).toBe("Mostrando 101 a 112 de 112 notas");
    expect(resumo.temProxima).toBe(false);
  });

  it("cabendo tudo numa página, não há para onde navegar", () => {
    const resumo = resumoDaPagina(
      pagina({ count: 3, results: [nota(), nota(), nota()] }),
      1,
    );
    // Numa página só, "1 a 3 de 3" é ruído: não há faixa recortada de nada.
    expect(resumo.texto).toBe("Mostrando 3 notas");
    expect(resumo.temAnterior).toBe(false);
    expect(resumo.temProxima).toBe(false);
  });

  it("sem nota nenhuma não diz nada: quem avisa é a tabela", () => {
    // Um segundo "nenhuma nota" embaixo da tabela repetia o mesmo recado.
    expect(resumoDaPagina(pagina(), 1).texto).toBe("");
  });

  it("uma nota só fala no singular", () => {
    expect(resumoDaPagina(pagina({ count: 1, results: [nota()] }), 1).texto).toBe(
      "Mostrando 1 nota",
    );
  });
});

describe("separarOsXmls", () => {
  const arquivo = (name: string) => ({ name });

  it("o lote misto manda os XMLs e nomeia os que ficaram de fora", () => {
    // O caso comum: a nota chega por e-mail em XML e em PDF, e quem baixa a
    // pasta do mês baixa os dois.
    const { xmls, descartados } = separarOsXmls([
      arquivo("nota-1.xml"),
      arquivo("danfe-1.pdf"),
      arquivo("nota-2.xml"),
      arquivo("recibo.jpg"),
    ]);

    expect(xmls).toEqual([arquivo("nota-1.xml"), arquivo("nota-2.xml")]);
    expect(descartados).toHaveLength(1);
    expect(descartados[0].arquivos).toEqual(["danfe-1.pdf", "recibo.jpg"]);
    expect(descartados[0].motivo).toContain("XML");
  });

  it("nenhum arquivo do lote some: ou vai, ou aparece na lista", () => {
    const lote = [
      arquivo("a.xml"),
      arquivo("b.pdf"),
      arquivo("c.XML"),
      arquivo("d.png"),
      arquivo("e.xml"),
    ];

    const { xmls, descartados } = separarOsXmls(lote);
    const contados =
      xmls.length + descartados.reduce((soma, g) => soma + g.arquivos.length, 0);

    expect(contados).toBe(lote.length);
  });

  it("XML de maiúscula continua sendo XML", () => {
    // O e-mail do fornecedor manda NOTA.XML tanto quanto nota.xml.
    expect(separarOsXmls([arquivo("NOTA.XML")]).xmls).toEqual([arquivo("NOTA.XML")]);
    expect(separarOsXmls([arquivo("NOTA.XML")]).descartados).toEqual([]);
  });

  it("lote só de XML não inventa recusa", () => {
    expect(separarOsXmls([arquivo("a.xml"), arquivo("b.xml")]).descartados).toEqual([]);
  });

  it("lote sem um XML sequer não tem o que mandar", () => {
    const { xmls, descartados } = separarOsXmls([arquivo("danfe.pdf")]);

    expect(xmls).toEqual([]);
    expect(descartados[0].arquivos).toEqual(["danfe.pdf"]);
  });
});

describe("voltarParaPrimeiraPagina", () => {
  it("traz de volta da página que deixou de existir, sem perder os filtros", () => {
    const antes = escolhas({ pagina: 4, loja: "loja-1", de: "2026-09-01" });

    expect(voltarParaPrimeiraPagina(antes)).toEqual({ ...antes, pagina: 1 });
  });

  it("na primeira página devolve o mesmo objeto, e não uma cópia", () => {
    // A tela guarda estas escolhas em estado: uma cópia nova refaria a busca
    // do zero por um clique que não mudou nada.
    const antes = escolhas({ pagina: 1 });

    expect(voltarParaPrimeiraPagina(antes)).toBe(antes);
  });
});

describe("opcoesDeClassificacao", () => {
  const plano: GrupoDeDespesa[] = [
    {
      id: "g1",
      nome: "Insumos",
      ativo: true,
      elementos: [
        { id: "e1", nome: "Farinha", grupo: "g1", ativo: true },
        { id: "e2", nome: "Fermento antigo", grupo: "g1", ativo: false },
      ],
    },
    {
      id: "g2",
      nome: "Grupo aposentado",
      ativo: false,
      elementos: [{ id: "e3", nome: "Uniforme", grupo: "g2", ativo: true }],
    },
    {
      id: "g3",
      nome: "Manutenção",
      ativo: true,
      elementos: [{ id: "e4", nome: "Forno", grupo: "g3", ativo: true }],
    },
  ];

  it("não oferece elemento desativado", () => {
    // Classificar num elemento fora da lista é lançar a despesa onde ninguém
    // mais olha no fim do mês.
    const nomes = opcoesDeClassificacao(plano, "").flatMap((g) =>
      g.elementos.map((e) => e.nome),
    );

    expect(nomes).toEqual(["Farinha", "Forno"]);
  });

  it("não oferece elemento de grupo desativado", () => {
    expect(opcoesDeClassificacao(plano, "").map((g) => g.nome)).toEqual([
      "Insumos",
      "Manutenção",
    ]);
  });

  it("o que já está lançado na nota continua na lista, marcado", () => {
    // Sem isto o seletor cairia no branco e a nota pareceria sem
    // classificação — e a reação seria classificá-la de novo.
    const insumos = opcoesDeClassificacao(plano, "e2")[0];

    expect(insumos.elementos.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(insumos.elementos[1].nome).toBe("Fermento antigo (fora da lista)");
  });

  it("o lançado num grupo desativado traz o grupo de volta só para ele", () => {
    const grupos = opcoesDeClassificacao(plano, "e3");

    expect(grupos.map((g) => g.nome)).toEqual([
      "Insumos",
      "Grupo aposentado",
      "Manutenção",
    ]);
    expect(grupos[1].elementos).toEqual([{ id: "e3", nome: "Uniforme (fora da lista)" }]);
  });

  it("grupo que ficou sem elemento nenhum não vira cabeçalho vazio", () => {
    const so_inativos: GrupoDeDespesa[] = [
      {
        id: "g9",
        nome: "Vazio",
        ativo: true,
        elementos: [{ id: "e9", nome: "Saiu", grupo: "g9", ativo: false }],
      },
    ];

    expect(opcoesDeClassificacao(so_inativos, "")).toEqual([]);
  });

  it("elemento ativo de grupo ativo não ganha marca nenhuma", () => {
    expect(opcoesDeClassificacao(plano, "e1")[0].elementos[0].nome).toBe("Farinha");
  });
});

describe("contratouNotasFiscais", () => {
  it("a aba aparece para a empresa que contratou", () => {
    expect(contratouNotasFiscais({ id: 1, modulos: { notas_fiscais: true } })).toBe(true);
  });

  it("empresa sem o módulo não vê a aba", () => {
    expect(contratouNotasFiscais({ id: 1, modulos: { notas_fiscais: false } })).toBe(false);
  });

  it("enquanto a resposta não chega, a aba fica fora do menu", () => {
    // Mostrar e depois sumir faria a aba piscar em toda abertura do painel.
    expect(contratouNotasFiscais(undefined)).toBe(false);
  });

  it("resposta de backend antigo, sem a lista de módulos, não liga nada", () => {
    expect(contratouNotasFiscais({ id: 1 })).toBe(false);
  });
});

describe("trocarDeFiltro", () => {
  it("qualquer filtro novo devolve a pessoa para a primeira página", () => {
    // Na página 4 de um filtro antigo, o filtro novo devolveria lista vazia e
    // a tela diria que não existe nota nenhuma — quando existem.
    expect(trocarDeFiltro(escolhas({ pagina: 4 }), { loja: "loja-2" })).toEqual(
      escolhas({ pagina: 1, loja: "loja-2" }),
    );
  });

  it("guarda o que já estava escolhido nos outros filtros", () => {
    expect(
      trocarDeFiltro(escolhas({ loja: "loja-1", de: "2026-09-01", pagina: 3 }), {
        soPendentes: false,
      }),
    ).toEqual(escolhas({ loja: "loja-1", de: "2026-09-01", soPendentes: false, pagina: 1 }));
  });
});

describe("andarDePagina", () => {
  it("próximas avança uma página", () => {
    expect(andarDePagina(escolhas({ pagina: 2 }), 1).pagina).toBe(3);
  });

  it("anteriores volta uma página", () => {
    expect(andarDePagina(escolhas({ pagina: 2 }), -1).pagina).toBe(1);
  });

  it("nunca desce abaixo da primeira página", () => {
    // page=0 é um pedido que o servidor recusa: a tela cairia num erro por um
    // clique num botão que já devia estar desabilitado.
    expect(andarDePagina(escolhas({ pagina: 1 }), -1).pagina).toBe(1);
  });

  it("andar não mexe em filtro nenhum", () => {
    expect(andarDePagina(escolhas({ loja: "loja-1", pagina: 1 }), 1)).toEqual(
      escolhas({ loja: "loja-1", pagina: 2 }),
    );
  });
});

describe("resultadoDoLote", () => {
  const descartados = [{ motivo: "Não é um arquivo XML.", arquivos: ["nota.pdf"] }];

  it("as recusas do servidor NUNCA são engolidas pelo caminho", () => {
    // O pior desfecho desta tela: a gerência acha que lançou uma despesa que
    // não entrou. Toda recusa que o servidor mandou tem que chegar à tela.
    const resultado = resultadoDoLote(descartados, {
      importadas: [nota(), nota()],
      recusadas: [
        { arquivo: "a.xml", motivo: "já foi lançada" },
        { arquivo: "b.xml", motivo: "CNPJ não cadastrado" },
        { arquivo: "c.xml", motivo: "já foi lançada" },
      ],
    });

    expect(resultado.importadas).toBe(2);
    expect(resultado.recusadas.flatMap((grupo) => grupo.arquivos)).toEqual([
      "nota.pdf",
      "a.xml",
      "c.xml",
      "b.xml",
    ]);
  });

  it("os descartados aqui na máquina também não somem", () => {
    const resultado = resultadoDoLote(descartados, {
      importadas: [nota()],
      recusadas: [],
    });

    expect(resultado.recusadas).toEqual(descartados);
  });

  it("os descartados vêm antes das recusas do servidor", () => {
    // São os arquivos que a pessoa acabou de soltar e reconhece pelo nome.
    const resultado = resultadoDoLote(descartados, {
      importadas: [],
      recusadas: [{ arquivo: "a.xml", motivo: "já foi lançada" }],
    });

    expect(resultado.recusadas.map((grupo) => grupo.motivo)).toEqual([
      "Não é um arquivo XML.",
      "já foi lançada",
    ]);
  });

  it("lote inteiro recusado ainda conta zero importadas, não some da tela", () => {
    const resultado = resultadoDoLote([], {
      importadas: [],
      recusadas: [{ arquivo: "a.xml", motivo: "já foi lançada" }],
    });

    expect(resultado.importadas).toBe(0);
    expect(resultado.recusadas).toHaveLength(1);
  });
});

describe("resumoDoLote", () => {
  const recusa = (quantos: number) => [
    { motivo: "qualquer", arquivos: Array.from({ length: quantos }, (_, i) => `f${i}.xml`) },
  ];

  it("conta arquivos, e não motivos", () => {
    expect(resumoDoLote(3, recusa(4))).toEqual({
      entraram: "3 notas entraram",
      ficaramDeFora: "4 arquivos ficaram de fora",
    });
  });

  it("soma os arquivos de todos os motivos", () => {
    expect(
      resumoDoLote(0, [
        { motivo: "a", arquivos: ["1.xml", "2.xml"] },
        { motivo: "b", arquivos: ["3.pdf"] },
      ]).ficaramDeFora,
    ).toBe("3 arquivos ficaram de fora");
  });

  it("uma nota e um arquivo falam no singular", () => {
    expect(resumoDoLote(1, recusa(1))).toEqual({
      entraram: "1 nota entrou",
      ficaramDeFora: "1 arquivo ficou de fora",
    });
  });

  it("lote sem nenhuma nota diz isso com todas as letras", () => {
    expect(resumoDoLote(0, recusa(2)).entraram).toBe("Nenhuma nota entrou");
  });

  it("sem recusa nenhuma não sobra frase para a tela", () => {
    expect(resumoDoLote(5, [])).toEqual({
      entraram: "5 notas entraram",
      ficaramDeFora: null,
    });
  });
});

describe("mensagemDeErroDoEnvio", () => {
  it("a página de erro em HTML do servidor não chega crua na tela", () => {
    // Um lote grande demais é recusado antes da nossa parte do código, e o
    // que volta é uma página inteira de HTML: a gerência de uma padaria via um
    // paredão de código e não sabia o que fazer com aquilo.
    const recado = mensagemDeErroDoEnvio(
      new Error("<!DOCTYPE html>\n<html><body>TooManyFilesSent</body></html>"),
    );

    expect(recado).not.toContain("<");
    expect(recado).toBe(
      "Não foi possível enviar as notas: o servidor não respondeu como esperado. Se você mandou muitos arquivos de uma vez, tente em lotes de até 500.",
    );
  });

  it("não crava o motivo: HTML também chega quando o servidor cai", () => {
    // O 502 do proxy chega como página HTML igualzinho. Mandar dividir o lote
    // nesse caso faz a gerência dividir a pasta em três e falhar três vezes.
    const recado = mensagemDeErroDoEnvio(
      new Error("<html><head><title>502 Bad Gateway</title></head></html>"),
    );

    expect(recado).not.toContain("<");
    expect(recado).toContain("não respondeu como esperado");
  });

  it("a recusa em português que o servidor escreveu passa inteira", () => {
    expect(mensagemDeErroDoEnvio(new Error("Envie no maximo 500 arquivos por vez."))).toBe(
      "Envie no maximo 500 arquivos por vez.",
    );
  });

  it("erro sem mensagem nenhuma ainda diz alguma coisa", () => {
    expect(mensagemDeErroDoEnvio(new Error(""))).toBe(
      "Não foi possível enviar as notas. Tente de novo.",
    );
    expect(mensagemDeErroDoEnvio(null)).toBe(
      "Não foi possível enviar as notas. Tente de novo.",
    );
  });
});

describe("seletorDaLinha", () => {
  const plano: GrupoDeDespesa[] = [
    {
      id: "g1",
      nome: "Insumos",
      ativo: true,
      elementos: [{ id: "e1", nome: "Farinha", grupo: "g1", ativo: true }],
    },
  ];

  const linha = { elementoId: "e1", elementoNome: "Farinha" };
  const semClassificacao = { elementoId: "", elementoNome: "" };

  it("com o plano no ar, o seletor oferece tudo e aceita troca", () => {
    const seletor = seletorDaLinha("pronto", plano, semClassificacao);

    expect(seletor.desabilitado).toBe(false);
    expect(seletor.vazio).toBe("Ainda não escolhido");
    expect(seletor.grupos.map((grupo) => grupo.nome)).toEqual(["Insumos"]);
  });

  it("plano fora do ar não deixa a nota classificada parecer não classificada", () => {
    // Sem isto o value não casa com nenhuma option, o navegador cai na
    // primeira, e um clique manda elemento: null — apagando a classificação
    // que estava certa.
    const seletor = seletorDaLinha("falhou", [], linha);

    expect(seletor.atual).toEqual({ id: "e1", nome: "Farinha" });
    expect(seletor.vazio).toBeNull();
    expect(seletor.desabilitado).toBe(true);
  });

  it("plano ainda carregando também não aceita troca", () => {
    const seletor = seletorDaLinha("carregando", [], linha);

    expect(seletor.desabilitado).toBe(true);
    expect(seletor.atual).toEqual({ id: "e1", nome: "Farinha" });
  });

  it("nota sem classificação diz por que o seletor está parado", () => {
    expect(seletorDaLinha("falhou", [], semClassificacao)).toEqual({
      desabilitado: true,
      vazio: "Não foi possível carregar as opções",
      atual: null,
      grupos: [],
    });

    expect(seletorDaLinha("carregando", [], semClassificacao).vazio).toBe(
      "Carregando as opções...",
    );
  });

  it("sem o plano, nenhuma opção do plano é oferecida", () => {
    // Oferecer meia lista seria pior que não oferecer nenhuma: a gerência
    // classificaria no elemento errado por ser o único que apareceu.
    expect(seletorDaLinha("falhou", plano, linha).grupos).toEqual([]);
  });
});

describe("mostrarAbaDeNotas", () => {
  const contratou = { id: 1, modulos: { notas_fiscais: true } };
  const naoContratou = { id: 1, modulos: { notas_fiscais: false } };

  it("a empresa que contratou vê a aba", () => {
    expect(
      mostrarAbaDeNotas({ usuario: contratou, carregando: false, falhou: false }),
    ).toBe(true);
  });

  it("a empresa que não contratou não vê a aba", () => {
    expect(
      mostrarAbaDeNotas({ usuario: naoContratou, carregando: false, falhou: false }),
    ).toBe(false);
  });

  it("enquanto a resposta não chega, a aba fica fora — para não piscar", () => {
    expect(mostrarAbaDeNotas({ carregando: true, falhou: false })).toBe(false);
  });

  it("resposta que falhou não vira 'a empresa não tem o módulo'", () => {
    // O token vencido numa aba antiga volta como erro (o /user/me/ não renova
    // sessão). Sumir com a aba aí é dizer ao cliente pagante que ele perdeu o
    // que comprou; quem barra de verdade é o servidor.
    expect(mostrarAbaDeNotas({ carregando: false, falhou: true })).toBe(true);
  });
});
