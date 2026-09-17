import type { FechamentoLido, LojaDoPainel } from "./services/painel";
import type { Visao } from "./hooks/usePainel";
import type { Periodo } from "./services/fechamentos";

/** "TODOS" soma os tres turnos; o resto olha um turno so. */
export type FiltroTurno = Periodo | "TODOS";

// Regras de leitura do painel. Ficam fora do componente porque a mesma
// montagem serve as duas abas e porque somar dinheiro no meio do JSX e o tipo
// de coisa que ninguem revisa.

export type StatusLinha =
  | { tipo: "CONFERIDO"; texto: string }
  | { tipo: "LANCADO"; texto: string }
  | { tipo: "REVISAR"; texto: string }
  | { tipo: "AUSENTE"; texto: string };

export type LinhaPainel = {
  lojaId: string;
  lojaNome: string;
  detalhe: string;
  pix: number;
  cartao: number;
  /** Ja com a retirada somada de volta: e o dinheiro que a empresa TEM, e nao
   *  o que sobrou na gaveta. A despesa fica fora — ver montarPainel. */
  dinheiro: number;
  linkPagamento: number;
  /** O que a loja gastou. Coluna propria porque esse dinheiro nao esta mais em
   *  caixa, mas continua somando no total: a venda valeu. */
  despesas: number;
  /** A liquidez bruta: quanto a loja movimentou. */
  total: number;
  status: StatusLinha;
  /** Os lancamentos crus, para o detalhe que abre ao clicar na linha. */
  lancamentos: FechamentoLido[];
};

export type ResumoPainel = {
  linhas: LinhaPainel[];
  totais: {
    pix: number;
    cartao: number;
    dinheiro: number;
    linkPagamento: number;
    despesas: number;
    total: number;
  };
  lojasComLancamento: number;
  lojasPendentes: LojaDoPainel[];
};

const numero = (valor: string | null) => Number(valor ?? 0);

const horaDoLancamento = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const statusDaLoja = (
  lancamentos: FechamentoLido[],
  visao: Visao,
): StatusLinha => {
  if (lancamentos.length === 0) {
    return { tipo: "AUSENTE", texto: "Não lançado" };
  }

  // Conferido e o fim da linha do painel: a gerencia ja abriu aquele turno e
  // disse que bate. Ganha de "revisar" inclusive quando a loja lancou duas
  // vezes no mesmo dia — se os dois lancamentos passaram pela conferencia, nao
  // sobrou nada para revisar.
  const tudoConferido = lancamentos.every((f) => f.conferido);

  if (visao === "MENSAL") {
    const dias = new Set(lancamentos.map((f) => f.data)).size;
    if (tudoConferido) {
      return {
        tipo: "CONFERIDO",
        texto: dias === 1 ? "1 dia · conferido" : `${dias} dias · conferidos`,
      };
    }
    return {
      tipo: "LANCADO",
      texto: dias === 1 ? "1 dia lançado" : `${dias} dias lançados`,
    };
  }

  if (tudoConferido) {
    // A hora continua na frase: conferido responde "posso confiar no numero",
    // mas quem cobra a loja atrasada precisa do horario do mesmo jeito. Diz
    // "lancado as" por extenso porque, ao lado de "Conferido", um horario solto
    // seria lido como a hora da conferencia.
    return {
      tipo: "CONFERIDO",
      texto:
        lancamentos.length === 1
          ? `Conferido · lançado às ${horaDoLancamento(lancamentos[0].created_at)}`
          : `${lancamentos.length} lançamentos · conferidos`,
    };
  }

  if (lancamentos.length > 1) {
    return { tipo: "REVISAR", texto: `${lancamentos.length} lançamentos · revisar` };
  }

  return { tipo: "LANCADO", texto: `Lançado às ${horaDoLancamento(lancamentos[0].created_at)}` };
};

/** Quem lancou (visao diaria) ou quantos lancamentos (visao mensal). */
const detalheDaLoja = (lancamentos: FechamentoLido[], visao: Visao) => {
  if (lancamentos.length === 0) return "—";

  if (visao === "MENSAL") {
    return `${lancamentos.length} ${lancamentos.length === 1 ? "lançamento" : "lançamentos"}`;
  }

  const nomes = [...new Set(lancamentos.map((f) => f.nome_funcionario))];
  return nomes.length > 1 ? `${nomes[0]} +${nomes.length - 1}` : nomes[0];
};

export const montarResumo = (
  lojas: LojaDoPainel[],
  fechamentos: FechamentoLido[],
  visao: Visao,
  turno: FiltroTurno = "TODOS",
): ResumoPainel => {
  const doTurno =
    turno === "TODOS"
      ? fechamentos
      : fechamentos.filter((f) => f.periodo === turno);

  const porLoja = new Map<string, FechamentoLido[]>();
  for (const fechamento of doTurno) {
    const lista = porLoja.get(fechamento.loja) ?? [];
    lista.push(fechamento);
    porLoja.set(fechamento.loja, lista);
  }

  const linhas = lojas.map((loja) => {
    const lancamentos = porLoja.get(loja.id) ?? [];
    const soma = (campo: "pix" | "cartao" | "dinheiro" | "link_pagamento") =>
      lancamentos.reduce((total, f) => total + numero(f[campo]), 0);

    const pix = soma("pix");
    const cartao = soma("cartao");
    const linkPagamento = soma("link_pagamento");

    // A retirada volta para a coluna de dinheiro; a despesa NAO. As duas saem
    // do dinheiro (nunca do PIX ou do cartao) e o campo `dinheiro` e o que
    // SOBROU na gaveta, ja sem as duas — mas elas nao terminam no mesmo lugar:
    //
    //   retirada -> o dono levou para guardar. O dinheiro EXISTE, so mudou de
    //               mao, entao pertence a coluna de dinheiro. Sem devolver, a
    //               loja que manda recolher todo dia aparecia vendendo no
    //               cartao.
    //   despesa  -> foi gasta. Somar na coluna de dinheiro diria que a empresa
    //               tem uma quantia que ja nao existe; ela tem coluna propria.
    //
    // A devolucao nao entra em nenhuma das duas: saiu da gaveta e cancelou a
    // venda junto, entao ja se anulou no numero contado.
    const dinheiro =
      soma("dinheiro") +
      lancamentos.reduce((total, f) => total + numero(f.valor_retirado), 0);
    const despesas = lancamentos.reduce(
      (total, f) =>
        total + (f.despesas ?? []).reduce((soma, d) => soma + numero(d.valor), 0),
      0,
    );

    return {
      lojaId: loja.id,
      lojaNome: loja.nome_loja,
      detalhe: detalheDaLoja(lancamentos, visao),
      pix,
      cartao,
      dinheiro,
      linkPagamento,
      despesas,
      // As cinco colunas fecham na horizontal: nada fica de fora e nada entra
      // duas vezes. A despesa soma porque a venda valeu — o dinheiro e que ja
      // nao esta mais la.
      total: pix + cartao + dinheiro + linkPagamento + despesas,
      lancamentos,
      status: statusDaLoja(lancamentos, visao),
    };
  });

  return {
    linhas,
    totais: {
      pix: linhas.reduce((t, l) => t + l.pix, 0),
      cartao: linhas.reduce((t, l) => t + l.cartao, 0),
      dinheiro: linhas.reduce((t, l) => t + l.dinheiro, 0),
      linkPagamento: linhas.reduce((t, l) => t + l.linkPagamento, 0),
      despesas: linhas.reduce((t, l) => t + l.despesas, 0),
      total: linhas.reduce((t, l) => t + l.total, 0),
    },
    lojasComLancamento: linhas.filter((l) => l.status.tipo !== "AUSENTE").length,
    lojasPendentes: lojas.filter((loja) => !(porLoja.get(loja.id) ?? []).length),
  };
};

/**
 * Domingo pelo calendario.
 *
 * Serve para o formulario adivinhar o turno antes da resposta do backend:
 * domingo e o unico motivo de turno unico que o navegador sabe sozinho —
 * feriado depende da lista calculada em app/feriados.py, e uma copia dela aqui
 * so serviria para divergir. Quem ja tem o lancamento em maos nao precisa
 * disto: o turno gravado ja diz se e domingo.
 */
export const ehDomingo = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay() === 0;
};

/**
 * O rotulo do periodo na tela.
 *
 * Existe para o "Manha" : "Tarde" nao ficar escrito em cinco lugares: quando o
 * periodo DIA entrou, cada ternario desses passou a chamar de "Tarde" o caixa
 * do dia inteiro.
 *
 * Nao precisa da data: o turno ja diz qual e. Domingo tem valor proprio, e
 * "DIA" e o expediente inteiro de quem fecha o caixa uma vez por dia — e do
 * feriado de quem fecha duas.
 */
export const rotuloDoPeriodo = (periodo: Periodo) =>
  periodo === "MANHA"
    ? "Manhã"
    : periodo === "TARDE"
      ? "Tarde"
      : periodo === "DOMINGO"
        ? "Domingo"
        : "Dia";

// A ordem em que a loja vive o dia. Domingo e dia inteiro fecham a lista
// porque nao convivem com os outros no mesmo dia: quando aparecem, e sozinhos.
const ORDEM_DO_DIA: Periodo[] = ["MANHA", "TARDE", "DOMINGO", "DIA"];

/** Os turnos que cobrem o expediente inteiro — quando um deles aparece, e
 *  sozinho no dia. */
const TURNOS_DE_DIA_INTEIRO: Periodo[] = ["DOMINGO", "DIA"];

const turnosLancados = (fechamentos: FechamentoLido[]): Periodo[] =>
  ORDEM_DO_DIA.filter((periodo) =>
    fechamentos.some((f) => f.periodo === periodo),
  );

/**
 * Os turnos que o filtro do painel oferece no periodo.
 *
 * Sai do calendario, e nao so do que ja foi lancado: as dez da manha a tarde
 * ainda nao existe no banco, e uma lista tirada do dado sumiria com o botao
 * dela — o filtro trocaria de forma no meio do dia, na frente de quem esta
 * usando. Do calendario vem manha e tarde nos dias comuns, e domingo quando o
 * periodo tem um.
 *
 * O que foi lancado entra para acrescentar o que o calendario nao sabe:
 * feriado, cuja lista mora no backend de proposito (app/feriados.py) e chega
 * aqui so pelo turno gravado. Num dia que ja se provou de turno unico ele
 * tambem manda sozinho — nesse dia nao houve manha nem tarde para recortar.
 *
 * `umFechamentoPorDia` vem da empresa, e nao de um palpite sobre os dados: um
 * mes em que a loja so lancou no feriado tem exatamente a mesma cara de um mes
 * de quem fecha o caixa uma vez por dia, e adivinhar erraria num dos dois.
 */
export const turnosDoFiltro = (
  fechamentos: FechamentoLido[],
  de: string,
  ate: string,
  umFechamentoPorDia = false,
): Periodo[] => {
  if (umFechamentoPorDia) return ["DIA"];

  const lancados = turnosLancados(fechamentos);
  if (
    de === ate &&
    lancados.length === 1 &&
    TURNOS_DE_DIA_INTEIRO.includes(lancados[0])
  ) {
    return lancados;
  }

  const possiveis = new Set(lancados);
  // O intervalo e no maximo um mes: a tela nunca pede mais do que isso.
  for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) {
    if (ehDomingo(dia)) {
      possiveis.add("DOMINGO");
    } else {
      possiveis.add("MANHA");
      possiveis.add("TARDE");
    }
  }

  return ORDEM_DO_DIA.filter((periodo) => possiveis.has(periodo));
};

export const emReais = (valor: number) =>
  valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- datas ----------
// Tudo em string YYYY-MM-DD: converter para Date e voltar troca o dia quando o
// fuso do navegador esta atras de UTC.

export const hojeISO = () => {
  const agora = new Date();
  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
};

export const mesDe = (dataISO: string) => dataISO.slice(0, 7);

export const somarDias = (dataISO: string, dias: number) => {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
};

export const somarMeses = (mesISO: string, meses: number) => {
  const [ano, mes] = mesISO.split("-").map(Number);
  const data = new Date(ano, mes - 1 + meses, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
};

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** "Sexta, 21 de agosto de 2026" — como no design. */
export const rotuloDoDia = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const semana = data
    .toLocaleDateString("pt-BR", { weekday: "long" })
    .replace("-feira", "");
  const resto = data.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${capitalizar(semana)}, ${resto}`;
};

/** "Agosto de 2026" */
export const rotuloDoMes = (mesISO: string) => {
  const [ano, mes] = mesISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, 1);
  return capitalizar(
    data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  );
};

// ---------- intervalos ----------

/** Segunda-feira da semana daquela data. A semana comercial da loja comeca na
 *  segunda, nao no domingo (que e o dia de turno unico). */
export const inicioDaSemana = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const desdeSegunda = (data.getDay() + 6) % 7;
  return somarDias(dataISO, -desdeSegunda);
};

export const fimDaSemana = (dataISO: string) => somarDias(inicioDaSemana(dataISO), 6);

export const inicioDoMes = (mesISO: string) => `${mesISO}-01`;

export const fimDoMes = (mesISO: string) => {
  const [ano, mes] = mesISO.split("-").map(Number);
  const ultimo = new Date(ano, mes, 0).getDate();
  return `${mesISO}-${String(ultimo).padStart(2, "0")}`;
};

/** "24 a 30 de agosto de 2026", ou com os dois meses quando a semana vira o mes. */
export const rotuloDaSemana = (dataISO: string) => {
  const de = inicioDaSemana(dataISO);
  const ate = fimDaSemana(dataISO);
  const dia = (iso: string) => Number(iso.split("-")[2]);
  const mesEAno = (iso: string) => {
    const [ano, mes] = iso.split("-").map(Number);
    return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };

  return mesDe(de) === mesDe(ate)
    ? `${dia(de)} a ${dia(ate)} de ${mesEAno(de)}`
    : `${dia(de)} de ${mesEAno(de)} a ${dia(ate)} de ${mesEAno(ate)}`;
};
