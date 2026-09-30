import { emReais } from "@/features/fechamento/painel-dados";

import type { GrupoDeDespesa } from "@/features/admin/services/notas";
import type { UsuarioAtual } from "@/shared/services/auth";

import type {
  Banco,
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

/** O que a gerência escolheu na barra de filtros. */
export type EscolhasDoExtrato = {
  /** A fila de trabalho: o que ainda falta classificar. */
  soPendentes: boolean;
  loja: string;
  contaBancaria: string;
  de: string;
  ate: string;
  pagina: number;
};

export const ESCOLHAS_INICIAIS: EscolhasDoExtrato = {
  soPendentes: true,
  loja: "",
  contaBancaria: "",
  de: "",
  ate: "",
  pagina: 1,
};

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
  if (escolhas.de) filtro.de = escolhas.de;
  if (escolhas.ate) filtro.ate = escolhas.ate;
  return filtro;
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
  return frases;
};

export const periodoDaImportacao = (importado: ExtratoImportado): string | null =>
  importado.periodo_de && importado.periodo_ate
    ? `${emDataBrasileira(importado.periodo_de)} a ${emDataBrasileira(importado.periodo_ate)}`
    : null;

/** Só OFX por enquanto. Separado antes do envio para o PDF solto por engano
 *  virar recado na hora, e não uma ida ao servidor. */
export const separarOsOfx = <A extends { name: string }>(arquivos: A[]) => {
  const ofx: A[] = [];
  const descartados: { arquivo: string; motivo: string }[] = [];
  for (const arquivo of arquivos) {
    if (arquivo.name.toLowerCase().endsWith(".ofx")) ofx.push(arquivo);
    else
      descartados.push({
        arquivo: arquivo.name,
        motivo:
          "Por enquanto o sistema lê extratos em OFX. No internet banking, exporte o extrato escolhendo o formato OFX.",
      });
  }
  return { ofx, descartados };
};

// ---------- resumo ----------

export type CartaoDoResumo = { rotulo: string; valor: string; destaque?: "alerta" };

export const cartoesDoResumo = (resumo: ResumoDoExtrato): CartaoDoResumo[] => {
  const cartoes: CartaoDoResumo[] = [
    { rotulo: "Entrou", valor: `R$ ${emReais(Number(resumo.entradas))}` },
    { rotulo: "Saiu", valor: `R$ ${emReais(Math.abs(Number(resumo.saidas)))}` },
  ];
  if (resumo.pendentes.quantidade) {
    cartoes.push({
      rotulo: "Falta classificar",
      valor: plural(resumo.pendentes.quantidade, "movimentação", "movimentações"),
      destaque: "alerta",
    });
  }
  return cartoes;
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
