import {
  emReais,
  fimDaSemana,
  fimDoMes,
  inicioDaSemana,
  inicioDoMes,
  mesDe,
} from "@/features/fechamento/painel-dados";

import type { GrupoDeDespesa } from "@/features/admin/services/notas";
import type { UsuarioAtual } from "@/shared/services/auth";

import type {
  Banco,
  ContaBancaria,
  MudancaDaConta,
  BlocoDoResumo,
  CategoriaDeMovimento,
  Classificacao,
  ContaDaTransacao,
  ExtratoImportado,
  FiltroDeTransacoes,
  PaginaDeTransacoes,
  ResumoDoExtrato,
  TipoDeMovimento,
  TransacaoBancaria,
} from "./services/banco";

// O que a tela do extrato calcula sozinha, fora do componente — mesmo caminho
// de `notas-da-tela`: aqui dá para testar sem renderizar nada.

/** Os mesmos três recortes das Saídas, dos Gráficos e dos Comprovantes. */
export type Granularidade = "DIA" | "SEMANA" | "MES";

/** O que a gerência escolheu: o período em cima, as lojas logo abaixo. */
export type EscolhasDoExtrato = {
  /** A fila de trabalho: o que ainda falta classificar. */
  soPendentes: boolean;
  granularidade: Granularidade;
  /** Âncora do Dia e da Semana. */
  dia: string;
  /** "AAAA-MM", âncora do Mês. */
  mes: string;
  loja: string;
  contaBancaria: string;
  pagina: number;
};

/** Abre no mês: o extrato do banco se baixa e se fecha por mês, e é por mês
 *  que a contabilidade pergunta. */
export const escolhasIniciais = (hoje: string): EscolhasDoExtrato => ({
  soPendentes: true,
  granularidade: "MES",
  dia: hoje,
  mes: mesDe(hoje),
  loja: "",
  contaBancaria: "",
  pagina: 1,
});

/** O recorte vira um intervalo só, que é o que a API entende. */
export const intervaloDasEscolhas = ({
  granularidade,
  dia,
  mes,
}: Pick<EscolhasDoExtrato, "granularidade" | "dia" | "mes">) =>
  granularidade === "DIA"
    ? { de: dia, ate: dia }
    : granularidade === "SEMANA"
      ? { de: inicioDaSemana(dia), ate: fimDaSemana(dia) }
      : { de: inicioDoMes(mes), ate: fimDoMes(mes) };

/** Só entra o que a pessoa escolheu. A página 1 omite `page`, para a chave de
 *  cache ser a mesma da primeira abertura da tela. */
export const montarFiltroDoExtrato = (escolhas: EscolhasDoExtrato): FiltroDeTransacoes => {
  const filtro: FiltroDeTransacoes = { ...filtroDoResumo(escolhas) };
  if (escolhas.soPendentes) filtro.pendente = "true";
  if (escolhas.pagina > 1) filtro.page = escolhas.pagina;
  return filtro;
};

/**
 * O recorte do resumo: lugar e período, e nada da fila de trabalho.
 *
 * "Só as que faltam classificar" é um modo de trabalhar a lista, não um
 * recorte do dinheiro — o resumo que obedecesse a ele mostraria o mês com as
 * saídas já classificadas faltando.
 */
export const filtroDoResumo = (escolhas: EscolhasDoExtrato) => {
  const filtro: Pick<FiltroDeTransacoes, "loja" | "conta_bancaria" | "de" | "ate"> = {};
  if (escolhas.loja) filtro.loja = escolhas.loja;
  if (escolhas.contaBancaria) filtro.conta_bancaria = escolhas.contaBancaria;
  return { ...filtro, ...intervaloDasEscolhas(escolhas) };
};

/** Trocar qualquer filtro volta para a página 1: o filtro novo quase sempre
 *  tem menos páginas, e a 4 dele viria vazia. */
export const trocarDeFiltro = (
  escolhas: EscolhasDoExtrato,
  mudanca: Partial<EscolhasDoExtrato>,
): EscolhasDoExtrato => ({ ...escolhas, ...mudanca, pagina: 1 });

export const andarDePagina = (
  escolhas: EscolhasDoExtrato,
  direcao: 1 | -1,
): EscolhasDoExtrato => ({ ...escolhas, pagina: Math.max(escolhas.pagina + direcao, 1) });

/** Os bancos do cadastro, na ordem em que a gerente procura: os de agência
 *  primeiro, os digitais depois. Mesmos códigos do backend. */
export const BANCOS: { valor: Banco; nome: string }[] = [
  { valor: "SANTANDER", nome: "Santander" },
  { valor: "BANCO_DO_BRASIL", nome: "Banco do Brasil" },
  { valor: "ITAU", nome: "Itaú" },
  { valor: "BRADESCO", nome: "Bradesco" },
  { valor: "CAIXA", nome: "Caixa" },
  { valor: "INTER", nome: "Inter" },
  { valor: "NUBANK", nome: "Nubank" },
  { valor: "PICPAY", nome: "PicPay" },
  { valor: "OUTRO", nome: "Outro" },
];

/** "2026-10-05" → "05/10/2026", sem passar por Date: o fuso do navegador
 *  atrás de UTC devolveria o dia anterior. */
export const emDataBrasileira = (iso: string) => iso.split("-").reverse().join("/");

/** "Santander 12345-6", ou o apelido quando a gerente deu um. */
export const nomeDaConta = (conta: Pick<ContaDaTransacao, "banco_nome" | "numero" | "apelido">) =>
  conta.apelido || `${conta.banco_nome} ${conta.numero}`;

/** Dinheiro com sinal, do jeito que o extrato do banco mostra. */
export const valorComSinal = (valor: string | number) => {
  const numero = Number(valor);
  const sinal = numero < 0 ? "− " : numero > 0 ? "+ " : "";
  return `${sinal}R$ ${emReais(Math.abs(numero))}`;
};

/** O que a edição de uma conta mudou de fato, já aparado. */
export type RascunhoDaConta = Pick<ContaBancaria, "banco" | "agencia" | "numero" | "apelido">;

/**
 * Só o que mudou vai no PATCH; nada mudou, nada vai.
 *
 * O número não pode ficar vazio: é ele que confere se o extrato subido é
 * mesmo desta conta, e sem ele qualquer arquivo entraria.
 */
export const mudancaDaConta = (
  conta: RascunhoDaConta,
  rascunho: RascunhoDaConta,
): { mudanca: MudancaDaConta | null; erro: string | null } => {
  const limpo = {
    banco: rascunho.banco,
    agencia: rascunho.agencia.trim(),
    numero: rascunho.numero.trim(),
    apelido: rascunho.apelido.trim(),
  };
  if (!limpo.numero) return { mudanca: null, erro: "O número da conta não pode ficar vazio." };

  const mudanca: MudancaDaConta = {};
  (Object.keys(limpo) as (keyof typeof limpo)[]).forEach((campo) => {
    if (limpo[campo] !== conta[campo]) Object.assign(mudanca, { [campo]: limpo[campo] });
  });
  return { mudanca: Object.keys(mudanca).length ? mudanca : null, erro: null };
};

// ---------- a classificação numa escolha só ----------
//
// Tipo e categoria são duas perguntas, mas na linha viram um <select> só: quem
// passa pelo extrato escolhe "Aluguel" ou "Retirada de sócio" de uma vez, e
// dois seletores por linha dobrariam os cliques do mês. O valor da opção leva
// os dois, como "PAGAMENTO:<id do elemento>".

const SEPARADOR = ":";

export const valorDaClassificacao = (transacao: TransacaoBancaria): string => {
  if (!transacao.tipo) return "";
  const id =
    transacao.tipo === "PAGAMENTO" ? transacao.elemento?.id : transacao.categoria?.id;
  return `${transacao.tipo}${SEPARADOR}${id ?? ""}`;
};

/** O corpo do PATCH para a opção escolhida. "" desfaz a classificação. */
export const classificacaoDoValor = (valor: string): Classificacao => {
  if (!valor) return { tipo: null, elemento: null, categoria: null };
  const [tipo, id] = valor.split(SEPARADOR) as [TipoDeMovimento, string];
  return tipo === "PAGAMENTO"
    ? { tipo, elemento: id || null, categoria: null }
    : { tipo, elemento: null, categoria: id || null };
};

export type OpcaoDaLinha = { valor: string; nome: string };
export type GrupoDaLinha = { rotulo: string; opcoes: OpcaoDaLinha[] };

/** Mesma marca da tela de notas para o que a gerência tirou da lista. */
const FORA_DA_LISTA = " (fora da lista)";

const ROTULO_DO_TIPO: Record<TipoDeMovimento, string> = {
  PAGAMENTO: "Pagamento",
  TRANSFERENCIA: "Transferência",
  RECEBIMENTO: "Recebimento",
};

/**
 * O que o seletor de uma linha oferece.
 *
 * A ordem acompanha o sentido do dinheiro: numa saída o mais provável é
 * pagamento, numa entrada é recebimento, e o que a pessoa procura vem
 * primeiro. Os outros tipos continuam na lista — estorno é pagamento que
 * entrou, e transferência vai e vem.
 *
 * Só o que está ativo, mais o que já está lançado nesta linha: pela mesma
 * razão da tela de notas, sumir com a opção lançada faria o seletor cair no
 * branco e a linha parecer por classificar.
 */
export const opcoesDaLinha = (
  transacao: TransacaoBancaria,
  plano: GrupoDeDespesa[],
  categorias: CategoriaDeMovimento[],
): GrupoDaLinha[] => {
  const atual = valorDaClassificacao(transacao);

  const pagamentos: GrupoDaLinha[] = [];
  for (const grupo of plano) {
    const opcoes = grupo.elementos
      .map((elemento) => {
        const valor = `PAGAMENTO${SEPARADOR}${elemento.id}`;
        const vale = grupo.ativo && elemento.ativo;
        return vale || valor === atual
          ? { valor, nome: vale ? elemento.nome : elemento.nome + FORA_DA_LISTA }
          : null;
      })
      .filter((opcao): opcao is OpcaoDaLinha => opcao !== null);
    if (opcoes.length) pagamentos.push({ rotulo: `Pagamento · ${grupo.nome}`, opcoes });
  }

  const doTipo = (tipo: "TRANSFERENCIA" | "RECEBIMENTO"): GrupoDaLinha[] => {
    const opcoes = categorias
      .filter((categoria) => categoria.tipo === tipo)
      .map((categoria) => {
        const valor = `${tipo}${SEPARADOR}${categoria.id}`;
        return categoria.ativo || valor === atual
          ? {
              valor,
              nome: categoria.ativo ? categoria.nome : categoria.nome + FORA_DA_LISTA,
            }
          : null;
      })
      .filter((opcao): opcao is OpcaoDaLinha => opcao !== null);
    return opcoes.length ? [{ rotulo: ROTULO_DO_TIPO[tipo], opcoes }] : [];
  };

  const grupos =
    Number(transacao.valor) > 0
      ? [...doTipo("RECEBIMENTO"), ...doTipo("TRANSFERENCIA"), ...pagamentos]
      : [...pagamentos, ...doTipo("TRANSFERENCIA"), ...doTipo("RECEBIMENTO")];

  // A categoria foi apagada pelo /admin e a linha ficou só com o tipo: sem
  // esta opção o valor não casaria com nenhuma, o navegador mostraria a
  // primeira da lista, e a linha pareceria classificada no que não está.
  const conhecida = grupos.some((grupo) => grupo.opcoes.some((opcao) => opcao.valor === atual));
  if (atual && !conhecida && transacao.tipo) {
    grupos.unshift({
      rotulo: ROTULO_DO_TIPO[transacao.tipo],
      opcoes: [
        {
          valor: atual,
          nome:
            transacao.elemento?.nome ??
            transacao.categoria?.nome ??
            `${ROTULO_DO_TIPO[transacao.tipo]} sem categoria`,
        },
      ],
    });
  }

  return grupos;
};

/** Uma linha da tabela, já pronta para ser lida. */
export type LinhaDoExtrato = {
  id: string;
  data: string;
  descricao: string;
  lugar: string;
  valor: string;
  entrada: boolean;
  classificacao: string;
  /** "Transferência com Loja B", quando o sistema achou a outra ponta. */
  par: string | null;
  /** O aviso da venda automática: é a que a gerente pode querer corrigir. */
  automatica: string | null;
};

export const linhaDaTabela = (transacao: TransacaoBancaria): LinhaDoExtrato => ({
  id: transacao.id,
  data: emDataBrasileira(transacao.data),
  descricao: transacao.descricao,
  lugar: `${transacao.conta_bancaria.loja.nome_loja} · ${nomeDaConta(transacao.conta_bancaria)}`,
  valor: valorComSinal(transacao.valor),
  entrada: Number(transacao.valor) > 0,
  classificacao: valorDaClassificacao(transacao),
  par: transacao.par
    ? `Transferência com ${transacao.par.conta_bancaria.loja.nome_loja} (${nomeDaConta(
        transacao.par.conta_bancaria,
      )})`
    : null,
  automatica: transacao.automatica ? "Entrou como venda sozinha" : null,
});

// ---------- importação ----------

const plural = (quantidade: number, um: string, varios: string) =>
  `${quantidade} ${quantidade === 1 ? um : varios}`;

/**
 * O que um arquivo trouxe, numa frase.
 *
 * "Já existiam" aparece sempre que houver, e não só as novas: é a resposta à
 * dúvida de quem sobe o mês de novo — "duplicou?". Ver o número de repetidas
 * é o que dá a certeza de que não.
 */
export const frasesDaImportacao = (importado: ExtratoImportado): string[] => {
  const frases = [plural(importado.novas, "movimentação nova", "movimentações novas")];
  if (importado.repetidas) {
    frases.push(`${plural(importado.repetidas, "já existia", "já existiam")} e não entraram de novo`);
  }
  if (importado.pareadas) {
    frases.push(
      `${plural(importado.pareadas, "transferência entre lojas achada", "transferências entre lojas achadas")}`,
    );
  }
  if (importado.classificadas) {
    frases.push(
      `${plural(importado.classificadas, "classificada", "classificadas")} pelo que você já tinha respondido`,
    );
  }
  if (importado.vendas) {
    frases.push(
      `${plural(importado.vendas, "entrada marcada", "entradas marcadas")} como venda`,
    );
  }
  return frases;
};

export const periodoDaImportacao = (importado: ExtratoImportado): string | null =>
  importado.periodo_de && importado.periodo_ate
    ? `${emDataBrasileira(importado.periodo_de)} a ${emDataBrasileira(importado.periodo_ate)}`
    : null;

/** OFX de qualquer banco, e CSV, que é o que o PicPay exporta. Separado antes
 *  do envio para o PDF solto por engano virar recado na hora, e não uma ida
 *  ao servidor. O CSV que não for do PicPay o servidor recusa com o motivo. */
export const separarOsExtratos = <A extends { name: string }>(arquivos: A[]) => {
  const extratos: A[] = [];
  const descartados: { arquivo: string; motivo: string }[] = [];
  for (const arquivo of arquivos) {
    const nome = arquivo.name.toLowerCase();
    if (nome.endsWith(".ofx") || nome.endsWith(".csv")) extratos.push(arquivo);
    else
      descartados.push({
        arquivo: arquivo.name,
        motivo:
          "O sistema lê extratos em OFX e o CSV do PicPay. No internet banking, exporte o extrato escolhendo o formato OFX.",
      });
  }
  return { extratos, descartados };
};

// ---------- resumo ----------

/** O rótulo do cartão do total, no mesmo tom do fechamento de caixa. */
export const rotuloDoSaldo = (granularidade: Granularidade) =>
  ({ DIA: "SALDO DO DIA", SEMANA: "SALDO DA SEMANA", MES: "SALDO DO MÊS" })[granularidade];

/** Entrou menos saiu, em centavos pelo mesmo motivo da árvore. */
export const saldoDoResumo = (resumo: Pick<ResumoDoExtrato, "entradas" | "saidas">) =>
  (Math.round(Number(resumo.entradas) * 100) + Math.round(Number(resumo.saidas) * 100)) / 100;

/** O aviso em cima do total, no tom do "1 loja ainda não lançou". */
export const avisoDePendentes = (quantas: number) =>
  quantas === 1
    ? "1 movimentação para classificar"
    : `${quantas} movimentações para classificar`;

// ---------- a árvore do resumo ----------

/** Um galho (grupo do plano de contas) ou uma folha (o que foi escolhido na
 *  linha). Folha tem `filhos` vazio. */
export type NoDoResumo = {
  chave: string;
  nome: string;
  valor: number;
  quantidade: number;
  filhos: NoDoResumo[];
};

/** Como o servidor junta grupo e elemento: "Pessoal > Uniforme". */
const SEPARADOR_DO_GRUPO = " > ";

/** Do maior para o menor em tamanho, sem olhar o sinal: a pergunta do bloco é
 *  "onde foi a maior parte". O nome desempata, para a ordem não pular entre
 *  uma abertura e outra. */
const pelaGrandeza = (a: NoDoResumo, b: NoDoResumo) =>
  Math.abs(b.valor) - Math.abs(a.valor) || a.nome.localeCompare(b.nome, "pt-BR");

/**
 * O bloco de um tipo como árvore: grupo, e dentro dele o que foi escolhido.
 *
 * A lista chegava plana e na ordem do servidor ("Impostos > Simples",
 * "Pessoal > Vale", "Pessoal > Uniforme"...), que ordena pelo total COM
 * sinal — em Recebimento, a menor entrada vinha primeiro. E o total de
 * "Pessoal" não existia em lugar nenhum: era somar de cabeça.
 *
 * Transferência e recebimento não têm grupo e viram folhas soltas na raiz.
 */
export const arvoreDoBloco = (bloco: Pick<BlocoDoResumo, "categorias">): NoDoResumo[] => {
  const raiz: NoDoResumo[] = [];
  const grupos = new Map<string, NoDoResumo & { centavos: number }>();

  for (const categoria of bloco.categorias) {
    const valor = Number(categoria.valor);
    const chave = `${categoria.id}-${categoria.nome}`;
    const corte = categoria.nome.indexOf(SEPARADOR_DO_GRUPO);
    if (corte < 0) {
      raiz.push({ chave, nome: categoria.nome, valor, quantidade: categoria.quantidade, filhos: [] });
      continue;
    }

    const nomeDoGrupo = categoria.nome.slice(0, corte);
    let grupo = grupos.get(nomeDoGrupo);
    if (!grupo) {
      grupo = { chave: `grupo-${nomeDoGrupo}`, nome: nomeDoGrupo, valor: 0, centavos: 0, quantidade: 0, filhos: [] };
      grupos.set(nomeDoGrupo, grupo);
      raiz.push(grupo);
    }
    // Em centavos: somar 0.1 + 0.2 em float daria um total de grupo que não
    // bate com a soma dos filhos na última casa.
    grupo.centavos += Math.round(valor * 100);
    grupo.valor = grupo.centavos / 100;
    grupo.quantidade += categoria.quantidade;
    grupo.filhos.push({
      chave,
      nome: categoria.nome.slice(corte + SEPARADOR_DO_GRUPO.length),
      valor,
      quantidade: categoria.quantidade,
      filhos: [],
    });
  }

  for (const grupo of grupos.values()) grupo.filhos.sort(pelaGrandeza);
  return raiz
    .map((no) => ({ chave: no.chave, nome: no.nome, valor: no.valor, quantidade: no.quantidade, filhos: no.filhos }))
    .sort(pelaGrandeza);
};

// ---------- paginação ----------

const TAMANHO_DA_PAGINA = 50;

export const resumoDaPagina = (pagina: PaginaDeTransacoes, paginaAtual: number) => {
  const temAnterior = Boolean(pagina.previous);
  const temProxima = Boolean(pagina.next);
  if (pagina.count === 0 || pagina.results.length === 0) {
    return { texto: "", temAnterior, temProxima };
  }
  if (!temAnterior && !temProxima) {
    return {
      texto: `Mostrando ${plural(pagina.results.length, "movimentação", "movimentações")}`,
      temAnterior,
      temProxima,
    };
  }
  const primeira = (Math.max(paginaAtual, 1) - 1) * TAMANHO_DA_PAGINA + 1;
  const ultima = Math.min(primeira + pagina.results.length - 1, pagina.count);
  return {
    texto: `Mostrando ${primeira} a ${ultima} de ${pagina.count} movimentações`,
    temAnterior,
    temProxima,
  };
};

// ---------- acesso ----------

const semAcento = (texto?: string) =>
  (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * As abas do banco (Extrato, Contas e categorias) entram em Despesas?
 *
 * Duas perguntas, como no backend: a empresa contratou (`modulos.banco`) e o
 * cargo pode ver (gerência). Carregando, fica fora — mostrar e sumir faria a
 * aba piscar. Se a resposta FALHOU, fica, pela mesma razão da aba de notas: o
 * caso comum é token vencido numa aba antiga, e quem barra de verdade é o
 * servidor.
 */
export const mostrarAbasDoBanco = (resposta: {
  usuario?: UsuarioAtual;
  carregando: boolean;
  falhou: boolean;
}): boolean => {
  if (resposta.carregando) return false;
  if (resposta.falhou) return true;
  const cargo = semAcento(resposta.usuario?.group);
  const gerencia = cargo === "gerente" || cargo === "admin" || cargo === "administrador";
  return gerencia && resposta.usuario?.modulos?.banco === true;
};
