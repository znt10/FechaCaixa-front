import type { FechamentoLido, LojaDoPainel } from "./services/painel";
import type { Periodo } from "./services/fechamentos";

// O painel trata o fechamento como unidade — uma linha por loja/dia. Aqui a
// unidade e a saida: um mesmo turno pode ter gastado com gas e ainda ter tido
// dinheiro retirado, e sao dois eventos, com donos diferentes, que a gerencia
// cobra de gente diferente.

/** Os quatro tipos que movem dinheiro. */
export type TipoDeSaidaEmDinheiro = "DESPESA" | "RETIRADA" | "CONSUMO" | "DEVOLUCAO";

/** O desperdicio entra aqui como quinto tipo, mas ele NAO e dinheiro: o
 *  catalogo nao tem preco e ninguem pagou nada. Ele se conta em unidades, e
 *  por isso fica fora de `porTipo` e de `totais.tudo` — juntar os dois num
 *  mesmo numero somaria 8 coxinhas com R$ 8,00. */
export type TipoDeSaida = TipoDeSaidaEmDinheiro | "DESPERDICIO";

/** "TODAS" e o estado inicial da tela: os cinco tipos juntos. */
export type FiltroDeSaida = TipoDeSaida | "TODAS";

/**
 * Como a lista se ordena.
 *
 * "VALOR" e o padrao porque a primeira pergunta da tela e quanto — quem gastou
 * mais, quem consumiu mais. "NOME" existe para a outra leitura, a de conferir:
 * com 60 pessoas na lista, procurar uma pelo tamanho da barra e impossivel.
 */
export type OrdemDaLista = "VALOR" | "NOME";

const porNome = (a: string, b: string) => a.localeCompare(b, "pt-BR");

export type Saida = {
  id: string;
  lojaId: string;
  lojaNome: string;
  data: string;
  periodo: Periodo;
  tipo: TipoDeSaida;
  /** No que foi gasto, ou quem levou o dinheiro. */
  descricao: string;
  valor: number;
  /** Quem lancou o turno — o gerente. Nao e quem consumiu: isso e a descricao. */
  nomeFuncionario: string;
  /** So no consumo: o cadastro de quem comeu, que e por onde o total do mes
   *  agrupa. A pessoa nao e fixa numa loja, e o nome pode ser corrigido. */
  pessoaId?: string;
  /** So no desperdicio: unidades perdidas. Nos outros tipos o que vale e
   *  `valor`, e aqui ele e sempre 0. */
  quantidade?: number;
  /** So no desperdicio: o item do catalogo e a familia dele. O nome sozinho
   *  nao identifica — "Coxinha" existe em Salgados grande e em Salgados mini. */
  salgadoId?: string;
  categoria?: string;
};

export type LinhaDeSaidas = {
  lojaId: string;
  lojaNome: string;
  saidas: Saida[];
  total: number;
  /** Quanto de cada tipo, para a barra da linha dizer no que foi sem abrir.
   *  Conta as saidas exibidas: com um filtro ligado, a barra mostra o mesmo
   *  que a lista embaixo dela. */
  porTipo: Record<TipoDeSaidaEmDinheiro, number>;
  /** Unidades perdidas no periodo, nesta loja. Numero proprio e nao mais uma
   *  entrada em `porTipo`: aquele Record e em R$. */
  unidadesDesperdicadas: number;
};

/** Quanto uma pessoa consumiu no periodo, somado. */
export type LinhaDeConsumo = {
  pessoaId: string;
  nome: string;
  saidas: Saida[];
  total: number;
  /** Em quais lojas — a pessoa nao e fixa numa. */
  lojas: string[];
};

/** Quantas unidades de um item foram perdidas no periodo, somadas. */
export type LinhaDeDesperdicio = {
  salgadoId: string;
  nome: string;
  categoria: string;
  saidas: Saida[];
  /** Em UNIDADES, nao em reais. */
  total: number;
  /** Em quais lojas o item se perdeu. */
  lojas: string[];
};

export type ResumoDeSaidas = {
  linhas: LinhaDeSaidas[];
  /** Do periodo inteiro, sem o filtro: sao os tres tiles do topo, e e neles
   *  que se clica para filtrar. Encolher junto com o filtro apagaria o
   *  caminho de volta. */
  totais: {
    /** O que saiu DA EMPRESA: despesas + devolucoes.
     *
     *  Retirada e consumo ficam de fora, cada um por um motivo: a retirada
     *  mudou de mao mas continua sendo dinheiro da empresa, e o consumo nem se
     *  moveu. Os dois tem numero proprio, para a gerencia acompanhar. */
    tudo: number;
    despesas: number;
    retiradas: number;
    devolucoes: number;
    consumo: number;
    /** Em UNIDADES, nao em reais — o unico campo deste objeto que nao e R$. */
    desperdicio: number;
  };
};

const numero = (valor: string | null) => Number(valor ?? 0);

// Do fim do periodo para o comeco: quem abre o detalhe de uma loja quer ver o
// que saiu ontem, nao o que saiu no dia 1. Dentro do turno, a despesa vem
// antes da retirada, na mesma ordem em que o formulario pergunta.
// "DOMINGO" e "DIA" sao lancamentos do expediente inteiro (domingo, feriado, e
// a empresa que fecha o caixa uma vez por dia). Nos tres casos o turno e o
// unico daquele dia, entao qualquer posicao serve — o que nao serve e ficar
// fora do mapa, virando NaN na subtracao.
const ORDEM_DOS_TURNOS = { TARDE: 0, MANHA: 1, DOMINGO: 2, DIA: 3 } as const;
// Na ordem em que o formulario pergunta: retirada, despesa, devolucao. O
// consumo fica por ultimo porque nao e dinheiro que saiu da gaveta, e o
// desperdicio depois dele pelo mesmo motivo: tambem nao e.
const ORDEM_DOS_TIPOS = {
  DESPESA: 0,
  RETIRADA: 1,
  DEVOLUCAO: 2,
  CONSUMO: 3,
  DESPERDICIO: 4,
} as const;

const maisRecentePrimeiro = (a: Saida, b: Saida) =>
  b.data.localeCompare(a.data) ||
  ORDEM_DOS_TURNOS[a.periodo] - ORDEM_DOS_TURNOS[b.periodo] ||
  ORDEM_DOS_TIPOS[a.tipo] - ORDEM_DOS_TIPOS[b.tipo];

/** Um turno vira nenhuma, uma ou duas saidas. A flag sozinha nao basta: ligada
 *  com valor zerado e o meio do caminho do formulario, nao uma saida. */
const saidasDoTurno = (fechamento: FechamentoLido): Saida[] => {
  const saidas: Saida[] = [];
  const comum = {
    lojaId: fechamento.loja,
    lojaNome: fechamento.loja_nome,
    data: fechamento.data,
    periodo: fechamento.periodo,
    nomeFuncionario: fechamento.nome_funcionario,
  };

  // Uma linha por gasto: o turno que comprou gas e agua vira duas despesas.
  // Antes cabia uma so, e o resto ia empilhado no campo de texto.
  for (const despesa of fechamento.despesas ?? []) {
    if (numero(despesa.valor) <= 0) continue;
    saidas.push({
      ...comum,
      id: despesa.id,
      tipo: "DESPESA",
      descricao: despesa.descricao,
      valor: numero(despesa.valor),
    });
  }

  if (fechamento.houve_retirada && numero(fechamento.valor_retirado) > 0) {
    saidas.push({
      ...comum,
      id: `${fechamento.id}-RETIRADA`,
      tipo: "RETIRADA",
      descricao: fechamento.responsavel_retirada_nome ?? "Retirada",
      valor: numero(fechamento.valor_retirado),
    });
  }

  if (fechamento.houve_devolucao && numero(fechamento.devolucao_valor) > 0) {
    saidas.push({
      ...comum,
      id: `${fechamento.id}-DEVOLUCAO`,
      tipo: "DEVOLUCAO",
      descricao: "Devolução ao cliente",
      valor: numero(fechamento.devolucao_valor),
    });
  }

  // Consumo entra na lista porque e aqui que a gerencia le o que a loja
  // registrou — mas nao entra no total, la embaixo: dinheiro nenhum deixou a
  // gaveta. Uma linha por pessoa: o gerente lanca o consumo de cada uma no
  // turno que ele fecha, e a descricao e o nome de quem comeu.
  for (const consumo of fechamento.consumos ?? []) {
    if (numero(consumo.valor) <= 0) continue;
    saidas.push({
      ...comum,
      id: consumo.id,
      tipo: "CONSUMO",
      descricao: consumo.nome,
      valor: numero(consumo.valor),
      pessoaId: consumo.encarregado,
    });
  }

  // Desperdicio e outro que nao e dinheiro: o catalogo nao tem preco, entao
  // `valor` fica sempre 0 e quem conta e `quantidade`, em unidades. Uma linha
  // por item perdido, com a descricao sendo o nome do salgado.
  for (const perda of fechamento.desperdicios ?? []) {
    if (perda.quantidade <= 0) continue;
    saidas.push({
      ...comum,
      id: perda.id,
      tipo: "DESPERDICIO",
      descricao: perda.nome,
      valor: 0,
      quantidade: perda.quantidade,
      salgadoId: perda.salgado,
      categoria: perda.categoria_nome,
    });
  }

  return saidas;
};

/**
 * O consumo do periodo somado por pessoa.
 *
 * A tela agrupa por loja, e para consumo isso nao responde nada: a pessoa nao e
 * fixa numa loja — hoje esta na Lapa, amanha no Limao — entao o que ela
 * consumiu no mes fica espalhado em varias linhas. Este numero e o que a dona
 * desconta do salario, e precisa estar inteiro num lugar so.
 *
 * Agrupa pelo cadastro, e nao pelo nome: e o cadastro que sobrevive a uma
 * correcao de grafia. O nome vem junto do cadastro a cada leitura, entao
 * arrumar "Marina" em "Marina Melo" arruma as linhas todas de uma vez, sem
 * partir o total da pessoa em duas.
 */
export const montarConsumoPorPessoa = (
  fechamentos: FechamentoLido[],
  ordem: OrdemDaLista = "VALOR",
): LinhaDeConsumo[] => {
  const porPessoa = new Map<string, LinhaDeConsumo>();

  for (const fechamento of fechamentos) {
    for (const consumo of saidasDoTurno(fechamento)) {
      if (consumo.tipo !== "CONSUMO" || !consumo.pessoaId) continue;

      const linha = porPessoa.get(consumo.pessoaId) ?? {
        pessoaId: consumo.pessoaId,
        nome: consumo.descricao,
        saidas: [],
        total: 0,
        lojas: [],
      };

      linha.saidas.push(consumo);
      linha.total += consumo.valor;
      if (!linha.lojas.includes(consumo.lojaNome)) linha.lojas.push(consumo.lojaNome);
      porPessoa.set(consumo.pessoaId, linha);
    }
  }

  return [...porPessoa.values()]
    .map((linha) => ({
      ...linha,
      saidas: [...linha.saidas].sort(maisRecentePrimeiro),
      lojas: [...linha.lojas].sort(porNome),
    }))
    .sort((a, b) =>
      ordem === "NOME" ? porNome(a.nome, b.nome) : b.total - a.total,
    );
};

/**
 * O desperdicio do periodo somado por salgado.
 *
 * Por loja a lista so dizia quantas unidades cada loja perdeu, e a pergunta
 * que o catalogo veio responder e QUAL item vai para o lixo. Mesmo desenho do
 * consumo por pessoa, e agrupa pelo item, nao pelo nome: "Coxinha" grande e
 * "Coxinha" mini sao itens diferentes, e somar as duas esconderia qual delas
 * se perde.
 */
export const montarDesperdicioPorSalgado = (
  fechamentos: FechamentoLido[],
  ordem: OrdemDaLista = "VALOR",
): LinhaDeDesperdicio[] => {
  const porSalgado = new Map<string, LinhaDeDesperdicio>();

  for (const fechamento of fechamentos) {
    for (const perda of saidasDoTurno(fechamento)) {
      if (perda.tipo !== "DESPERDICIO" || !perda.salgadoId) continue;

      const linha = porSalgado.get(perda.salgadoId) ?? {
        salgadoId: perda.salgadoId,
        nome: perda.descricao,
        categoria: perda.categoria ?? "",
        saidas: [],
        total: 0,
        lojas: [],
      };

      linha.saidas.push(perda);
      linha.total += perda.quantidade ?? 0;
      if (!linha.lojas.includes(perda.lojaNome)) linha.lojas.push(perda.lojaNome);
      porSalgado.set(perda.salgadoId, linha);
    }
  }

  return [...porSalgado.values()]
    .map((linha) => ({
      ...linha,
      saidas: [...linha.saidas].sort(maisRecentePrimeiro),
      lojas: [...linha.lojas].sort(porNome),
    }))
    .sort((a, b) =>
      ordem === "NOME"
        ? porNome(a.nome, b.nome) || porNome(a.categoria, b.categoria)
        : b.total - a.total,
    );
};

export const montarSaidas = (
  lojas: LojaDoPainel[],
  fechamentos: FechamentoLido[],
  filtro: FiltroDeSaida = "TODAS",
  ordem: OrdemDaLista = "VALOR",
): ResumoDeSaidas => {
  const todas = fechamentos.flatMap(saidasDoTurno);

  const somar = (lista: Saida[]) => lista.reduce((total, s) => total + s.valor, 0);
  const somarUnidades = (lista: Saida[]) =>
    lista.reduce((total, s) => total + (s.quantidade ?? 0), 0);
  const doTipo = (tipo: TipoDeSaida) => todas.filter((s) => s.tipo === tipo);

  const linhas = lojas
    .map((loja) => {
      const saidas = todas
        .filter((s) => s.lojaId === loja.id && (filtro === "TODAS" || s.tipo === filtro))
        .sort(maisRecentePrimeiro);
      return {
        lojaId: loja.id,
        lojaNome: loja.nome_loja,
        saidas,
        total: somar(saidas),
        porTipo: {
          DESPESA: somar(saidas.filter((s) => s.tipo === "DESPESA")),
          RETIRADA: somar(saidas.filter((s) => s.tipo === "RETIRADA")),
          DEVOLUCAO: somar(saidas.filter((s) => s.tipo === "DEVOLUCAO")),
          CONSUMO: somar(saidas.filter((s) => s.tipo === "CONSUMO")),
        },
        unidadesDesperdicadas: somarUnidades(saidas.filter((s) => s.tipo === "DESPERDICIO")),
      };
    })
    // Loja que nao gastou nada nao vira linha de R$ 0,00: ausencia aqui e boa
    // noticia, ao contrario do painel, onde nao lancar e o problema.
    .filter((linha) => linha.saidas.length > 0)
    .sort((a, b) =>
      ordem === "NOME" ? porNome(a.lojaNome, b.lojaNome) : b.total - a.total,
    );

  return {
    linhas,
    totais: {
      // "tudo" e o dinheiro que a empresa PERDEU: despesa (gastou) e
      // devolucao (a venda foi desfeita). Sao os dois unicos que nao voltam.
      //
      // Retirada fica de fora, junto do consumo, e por isso tem numero
      // proprio: o dono levou para guardar, e o dinheiro continua sendo da
      // empresa. Somar aqui faria a tela dizer que a loja perdeu justamente
      // aquilo que foi posto a salvo — e quanto mais o dono recolhesse (que e
      // o comportamento certo), maior o "prejuizo" na tela.
      //
      // Consumo fica de fora pela razao vizinha: ninguem pagou na hora, entao
      // nenhum dinheiro deixou a gaveta.
      tudo: somar(doTipo("DESPESA")) + somar(doTipo("DEVOLUCAO")),
      despesas: somar(doTipo("DESPESA")),
      retiradas: somar(doTipo("RETIRADA")),
      devolucoes: somar(doTipo("DEVOLUCAO")),
      consumo: somar(doTipo("CONSUMO")),
      // Em unidades, nao em reais: o desperdicio nao tem preco no catalogo, e
      // por isso fica fora de "tudo" — ali e so o que a empresa perdeu em R$.
      desperdicio: somarUnidades(doTipo("DESPERDICIO")),
    },
  };
};
