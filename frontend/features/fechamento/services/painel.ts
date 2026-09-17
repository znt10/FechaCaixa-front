import { apiV1 } from "@/shared/services/api";
import type { DespesaLancada, Periodo } from "./fechamentos";

// ======================================================
// 🔹 PAINEL DE FECHAMENTO (Admin/Gerente)
// ======================================================
// Ao contrario do formulario, aqui tudo exige login: o backend ja limita o
// Gerente as lojas que ele administra, entao o front nao refiltra nada.

/**
 * O que uma pessoa consumiu no turno.
 *
 * Vem aninhado no fechamento porque e la que ele foi lancado: loja, dia e
 * turno do consumo sao os do turno que o gerente estava fechando. Buscar
 * consumo a parte daria uma segunda resposta para conferir com a primeira.
 *
 * `encarregado` e o cadastro — e por ele que o total do mes agrupa. O nome vem
 * junto porque a pessoa pode estar em loja diferente a cada dia, e e o nome
 * que a gerencia le.
 */
export type ConsumoDoTurno = {
  id: string;
  encarregado: string;
  nome: string;
  valor: string;
};

export type FechamentoLido = {
  id: string;
  loja: string;
  loja_nome: string;
  nome_funcionario: string;
  /** O cadastro de quem lancou. Nulo nos lancamentos anteriores a ele, que so
   *  tem o texto de `nome_funcionario`. */
  lancado_por: string | null;
  data: string;
  periodo: Periodo;
  pix: string | null;
  cartao: string | null;
  dinheiro: string | null;
  link_pagamento: string | null;
  /** As formas de pagamento cruas. Nao e o que a loja vendeu: `dinheiro` e o
   *  que sobrou na gaveta, ja sem a retirada e as despesas. */
  recebido: string;
  /** A liquidez bruta: quanto a loja movimentou. Soma retirada e despesa de
   *  volta, porque as duas sairam da gaveta DEPOIS da venda. */
  total: string;
  /** O que saiu da gaveta e ficou anotado: retirada + despesas + devolucao.
   *  Serve para a gerencia ler, nao para descontar de nada. */
  registrado: string;
  /** @deprecated apelidos de registrado e total; saem quando o backend limpar. */
  saidas: string;
  /** @deprecated */
  total_liquido: string;
  houve_retirada: boolean;
  responsavel_retirada: string | null;
  responsavel_retirada_nome: string | null;
  valor_retirado: string | null;
  despesas: DespesaLancada[];
  /** Registrada e neutra: o dinheiro saiu da gaveta e cancelou a venda junto,
   *  entao ja se descontou sozinha. Somar ou subtrair contaria duas vezes. */
  houve_devolucao: boolean;
  devolucao_valor: string | null;
  houve_desperdicio: boolean;
  desperdicio_detalhes: string | null;
  consumos: ConsumoDoTurno[];
  /** O que foi jogado fora no turno: uma linha por item de catalogo perdido.
   *  Vem aninhado pelo mesmo motivo do consumo — loja, dia e turno sao os do
   *  fechamento que o gerente estava lancando. */
  desperdicios: {
    id: string;
    salgado: string;
    nome: string;
    categoria_nome: string;
    quantidade: number;
  }[];
  conferido: boolean;
  conferido_em: string | null;
  conferido_por_nome: string | null;
  editado_por_nome: string | null;
  created_at: string;
};

/**
 * A planilha do periodo: baixa o .xlsx e devolve o nome do arquivo.
 *
 * Passa pelo `apiV1` em vez de ser um link direto porque o token pode ter
 * expirado — um link comum devolveria um JSON de erro no lugar do arquivo,
 * sem chance de renovar. O nome vem do servidor (empresa e periodo), e nao
 * daqui: e la que se sabe de qual empresa e o login.
 */
export const baixarPlanilhaDoPeriodo = async (de: string, ate: string) => {
  const res = await apiV1(`/planilha/?de=${de}&ate=${ate}`);
  const arquivo = await res.blob();

  const cabecalho = res.headers.get("Content-Disposition") ?? "";
  const nome =
    /filename="?([^"]+)"?/.exec(cabecalho)?.[1] ??
    `fechacaixa-${de}-a-${ate}.xlsx`;

  // O download so existe enquanto o clique acontece: a URL do blob e revogada
  // logo depois, senao o arquivo fica preso na memoria da aba ate recarregar.
  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = endereco;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(endereco);

  return nome;
};

export type LojaDoPainel = {
  id: string;
  nome_loja: string;
  ativo: boolean;
};

type PaginaDRF<T> = { count: number; next: string | null; results: T[] };

/**
 * Puxa todas as paginas de uma listagem do DRF.
 *
 * A visao mensal passa fácil das 50 linhas por pagina (lojas × dias × turnos),
 * e o painel soma tudo — uma pagina so daria total errado sem avisar. Segue
 * por `?page=N` em vez do link `next`, que vem com o host do backend e nao
 * com o dominio do front (as chamadas passam pelo rewrite /backend).
 */
const buscarTodasAsPaginas = async <T>(caminho: string): Promise<T[]> => {
  const separador = caminho.includes("?") ? "&" : "?";
  const itens: T[] = [];

  for (let pagina = 1; ; pagina += 1) {
    const res = await apiV1(`${caminho}${separador}page=${pagina}`);
    const dados: PaginaDRF<T> | T[] = await res.json();

    if (Array.isArray(dados)) return dados;

    itens.push(...dados.results);
    if (!dados.next) return itens;
  }
};

export const getLojasDoPainel = async (): Promise<LojaDoPainel[]> => {
  const lojas = await buscarTodasAsPaginas<LojaDoPainel>("/lojas/");
  return lojas.filter((loja) => loja.ativo);
};

export type ResponsavelDoPainel = {
  id: string;
  nome: string;
  ativo: boolean;
};

/** Quem pode retirar dinheiro, na conta de quem esta logado. Diferente da
 *  versao do formulario: aqui a conta vem do login, e nao do ?conta= do link. */
export const getResponsaveisDoPainel = async (): Promise<ResponsavelDoPainel[]> => {
  const pessoas =
    await buscarTodasAsPaginas<ResponsavelDoPainel>("/responsaveis-retirada/");
  return pessoas.filter((pessoa) => pessoa.ativo);
};

type EncarregadoDoPainel = {
  id: string;
  nome: string;
  pode_consumir: boolean;
  ativo: boolean;
};

/** Quem entra na lista de consumo, na conta de quem esta logado.
 *
 *  Nao e a mesma lista de quem retira dinheiro: sao dois cadastros diferentes,
 *  e dentro deste ainda ha duas marcas que se cruzam — quem fecha o caixa e
 *  quem come. Filtrar por `pode_consumir` aqui repete o que o backend ja
 *  recusa: a empresa tem 60 pessoas, e oferecer as 60 num seletor de consumo
 *  e como nao ter seletor. */
export const getQuemConsomeDoPainel = async (): Promise<ResponsavelDoPainel[]> => {
  const pessoas = await buscarTodasAsPaginas<EncarregadoDoPainel>("/encarregados/");
  return pessoas
    .filter((pessoa) => pessoa.ativo && pessoa.pode_consumir)
    .map(({ id, nome, ativo }) => ({ id, nome, ativo }));
};

/**
 * O que a gerencia pode corrigir num turno ja lancado.
 *
 * `loja`, `data` e `periodo` ficam de fora de proposito: mudar qualquer um
 * dos tres nao e corrigir um lancamento, e move-lo para outro lugar do painel
 * — se a loja errou o turno, o certo e apagar e lancar de novo.
 */
export type CamposEditaveis = Partial<{
  nome_funcionario: string;
  pix: string;
  cartao: string;
  dinheiro: string;
  link_pagamento: string;
  houve_retirada: boolean;
  responsavel_retirada: string | null;
  valor_retirado: string | null;
  /** A lista enviada substitui a anterior; vazia apaga todas. Omitida, as que
   *  existem ficam como estao. */
  despesas: { descricao: string; valor: string }[];
  houve_devolucao: boolean;
  devolucao_valor: string | null;
  houve_desperdicio: boolean;
  desperdicio_detalhes: string | null;
  /** Como as despesas: a lista enviada substitui a anterior, vazia apaga
   *  todas, omitida deixa como esta. `encarregado` e o id do cadastro — e por
   *  ele que o desconto do mes agrupa. */
  consumos: { encarregado: string; valor: string }[];
}>;

/** Correcao pela gerencia. O backend carimba editado_por sozinho — e o que
 *  diferencia este PATCH da janela de 20 minutos da propria loja. */
export const patchFechamento = async (
  id: string,
  campos: CamposEditaveis,
): Promise<FechamentoLido> => {
  const res = await apiV1(`/fechamentos-caixa/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(campos),
  });
  return res.json();
};

/** Marca o turno como conferido pelo gerente (endpoint dedicado: conferir
 *  nao e corrigir, entao nao carimba editado_por). */
export const conferirFechamento = async (id: string): Promise<FechamentoLido> => {
  const res = await apiV1(`/fechamentos-caixa/${id}/conferir/`, { method: "PATCH" });
  return res.json();
};

export const getFechamentosDoDia = (data: string) =>
  buscarTodasAsPaginas<FechamentoLido>(`/fechamentos-caixa/?data=${data}`);

/** Intervalo livre — e como a tela de graficos pede dia, semana e mes pelo
 *  mesmo caminho, sem tres formatos de parametro diferentes. */
export const getFechamentosDoIntervalo = (de: string, ate: string) =>
  buscarTodasAsPaginas<FechamentoLido>(`/fechamentos-caixa/?de=${de}&ate=${ate}`);

export const getFechamentosDoMes = (mes: string) =>
  buscarTodasAsPaginas<FechamentoLido>(`/fechamentos-caixa/?mes=${mes}`);

/** Cancela pela gerencia, com login. Mesmo endpoint da loja; quem decide o que
 *  cada um pode e o backend. */
export const cancelarFechamentoDoPainel = async (id: string): Promise<void> => {
  await apiV1(`/fechamentos-caixa/${id}/cancelar/`, { method: "POST" });
};
