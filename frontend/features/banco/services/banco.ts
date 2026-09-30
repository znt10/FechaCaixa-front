import { apiV1 } from "@/shared/services/api";

import type { ElementoDeDespesa } from "@/features/admin/services/notas";

// ======================================================
// 🔹 EXTRATO BANCARIO (Gerência)
// ======================================================
// O backend lê o OFX, grava só o que ainda não existe (subir o mês de novo
// não duplica nada), acha sozinho as transferências entre lojas e aplica o
// que a gerente já respondeu antes para a mesma descrição. O que sobra aqui é
// dizer o que é cada linha.

export type TipoDeMovimento = "PAGAMENTO" | "TRANSFERENCIA" | "RECEBIMENTO";

export type Banco =
  | "SANTANDER"
  | "BANCO_DO_BRASIL"
  | "ITAU"
  | "BRADESCO"
  | "CAIXA"
  | "INTER"
  | "NUBANK"
  | "PICPAY"
  | "OUTRO";

export type LojaResumida = { id: string; nome_loja: string };

export type ContaBancaria = {
  id: string;
  loja: LojaResumida;
  banco: Banco;
  banco_nome: string;
  agencia: string;
  numero: string;
  apelido: string;
  ativo: boolean;
};

export type NovaContaBancaria = {
  loja_id: string;
  banco: Banco;
  agencia: string;
  numero: string;
  apelido: string;
};

export type CategoriaDeMovimento = {
  id: string;
  tipo: Exclude<TipoDeMovimento, "PAGAMENTO">;
  tipo_nome: string;
  nome: string;
  ativo: boolean;
  /** A que o sistema usa sozinho quando acha as duas pontas de uma
   *  transferência entre lojas. */
  entre_lojas: boolean;
};

export type ContaDaTransacao = {
  id: string;
  loja: LojaResumida;
  banco: Banco;
  banco_nome: string;
  numero: string;
  apelido: string;
};

/**
 * Uma linha do extrato.
 *
 * `data`, `valor` e `descricao` vieram do banco e são read-only no backend: o
 * arquivo original está guardado, e a tela não pode discordar dele. Só a
 * classificação se mexe. `valor` tem sinal — negativo é saída.
 */
export type TransacaoBancaria = {
  id: string;
  data: string;
  valor: string;
  descricao: string;
  conta_bancaria: ContaDaTransacao;
  tipo: TipoDeMovimento | null;
  tipo_nome: string | null;
  elemento: ElementoDeDespesa | null;
  categoria: { id: string; nome: string; tipo: TipoDeMovimento; entre_lojas: boolean } | null;
  /** A outra ponta de uma transferência entre lojas, achada pelo sistema. */
  par: { id: string; data: string; conta_bancaria: ContaDaTransacao } | null;
  classificada: boolean;
};

export type PaginaDeTransacoes = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TransacaoBancaria[];
};

export type FiltroDeTransacoes = {
  pendente?: "true";
  loja?: string;
  conta_bancaria?: string;
  de?: string;
  ate?: string;
  page?: number;
};

export type CategoriaDoResumo = {
  id: string | null;
  nome: string;
  valor: string;
  quantidade: number;
};

export type BlocoDoResumo = {
  tipo: TipoDeMovimento;
  nome: string;
  valor: string;
  categorias: CategoriaDoResumo[];
};

/**
 * Quanto entrou e saiu no filtro, e para onde.
 *
 * `consolidado` é true quando o filtro pega todas as lojas: aí o servidor tira
 * da conta as transferências entre lojas, porque para a empresa o dinheiro só
 * mudou de bolso. Dinheiro em string decimal, como em todo o painel.
 */
export type ResumoDoExtrato = {
  consolidado: boolean;
  entradas: string;
  saidas: string;
  pendentes: { quantidade: number; valor: string };
  por_tipo: BlocoDoResumo[];
};

export type ExtratoImportado = {
  arquivo: string;
  novas: number;
  repetidas: number;
  pareadas: number;
  classificadas: number;
  periodo_de: string | null;
  periodo_ate: string | null;
};

export type ExtratoRecusado = { arquivo: string; motivo: string };

export type ResultadoDaImportacao = {
  importados: ExtratoImportado[];
  recusados: ExtratoRecusado[];
};

export type Classificacao = {
  tipo: TipoDeMovimento | null;
  elemento?: string | null;
  categoria?: string | null;
  aplicar_as_iguais?: boolean;
};

export type TransacaoClassificada = TransacaoBancaria & { iguais_classificadas: number };

const comoBusca = (filtros: Record<string, string | number | undefined>) => {
  const busca = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== "") busca.set(chave, String(valor));
  });
  return busca.toString();
};

export const getContasBancarias = async (): Promise<ContaBancaria[]> => {
  const res = await apiV1("/contas-bancarias/");
  return res.json();
};

export const criarContaBancaria = async (conta: NovaContaBancaria): Promise<ContaBancaria> => {
  const res = await apiV1("/contas-bancarias/", {
    method: "POST",
    body: JSON.stringify(conta),
  });
  return res.json();
};

export const mudarContaBancaria = async (
  id: string,
  mudanca: Partial<Omit<NovaContaBancaria, "loja_id">> & { ativo?: boolean },
): Promise<ContaBancaria> => {
  const res = await apiV1(`/contas-bancarias/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(mudanca),
  });
  return res.json();
};

export const getCategoriasDeMovimento = async (): Promise<CategoriaDeMovimento[]> => {
  const res = await apiV1("/categorias-de-movimento/");
  return res.json();
};

export const criarCategoriaDeMovimento = async (categoria: {
  tipo: CategoriaDeMovimento["tipo"];
  nome: string;
}): Promise<CategoriaDeMovimento> => {
  const res = await apiV1("/categorias-de-movimento/", {
    method: "POST",
    body: JSON.stringify(categoria),
  });
  return res.json();
};

export const mudarCategoriaDeMovimento = async (
  id: string,
  mudanca: { nome?: string; ativo?: boolean },
): Promise<CategoriaDeMovimento> => {
  const res = await apiV1(`/categorias-de-movimento/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(mudanca),
  });
  return res.json();
};

export const getTransacoes = async (
  filtros: FiltroDeTransacoes = {},
): Promise<PaginaDeTransacoes> => {
  const res = await apiV1(`/transacoes-bancarias/?${comoBusca(filtros)}`);
  return res.json();
};

/** O resumo ignora `pendente` e `page`: ele soma o período inteiro, não a
 *  página nem a fila de trabalho. */
export const getResumoDoExtrato = async (
  filtros: Pick<FiltroDeTransacoes, "loja" | "conta_bancaria" | "de" | "ate"> = {},
): Promise<ResumoDoExtrato> => {
  const res = await apiV1(`/transacoes-bancarias/resumo/?${comoBusca(filtros)}`);
  return res.json();
};

export const importarExtrato = async ({
  contaBancaria,
  arquivos,
}: {
  contaBancaria: string;
  arquivos: File[];
}): Promise<ResultadoDaImportacao> => {
  const corpo = new FormData();
  corpo.append("conta_bancaria", contaBancaria);
  arquivos.forEach((arquivo) => corpo.append("arquivos", arquivo));

  const res = await apiV1("/transacoes-bancarias/importar/", { method: "POST", body: corpo });
  return res.json();
};

export const classificarTransacao = async (
  id: string,
  classificacao: Classificacao,
): Promise<TransacaoClassificada> => {
  const res = await apiV1(`/transacoes-bancarias/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(classificacao),
  });
  return res.json();
};
