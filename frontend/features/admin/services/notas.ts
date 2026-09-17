import { apiV1 } from "@/shared/services/api";

// ======================================================
// 🔹 NOTAS FISCAIS (Admin)
// ======================================================
// O backend importa o XML, descobre a loja pelo CNPJ e o fornecedor, e
// recusa o que nao e despesa. O que sobra aqui e classificar cada nota num
// elemento do plano de contas — o resto ja veio pronto do XML.

export type ElementoDeDespesa = {
  id: string;
  nome: string;
  grupo: string;
  ativo: boolean;
};

export type GrupoDeDespesa = {
  id: string;
  nome: string;
  ativo: boolean;
  elementos: ElementoDeDespesa[];
};

/**
 * Uma nota fiscal importada.
 *
 * `numero`, `serie`, `data_emissao` e `valor_total` sao read-only de
 * proposito no backend: sao a prova da despesa, tirada do XML guardado, e o
 * relatorio nao pode divergir dele. So `elemento` se classifica.
 */
export type NotaFiscal = {
  id: string;
  numero: string;
  serie: string;
  data_emissao: string;
  valor_total: string;
  loja: { id: string; nome_loja: string };
  fornecedor: { id: string; razao_social: string; cnpj: string };
  elemento: ElementoDeDespesa | null;
  classificada: boolean;
};

export type NotaRecusada = { arquivo: string; motivo: string };

/** O que entrou e o que foi recusado do lote, por arquivo — quem sobe o XML
 *  precisa saber exatamente qual nota falhou e por que, nao so um total. */
export type ResultadoDoLote = {
  importadas: NotaFiscal[];
  recusadas: NotaRecusada[];
};

export type FiltroDeNotas = {
  classificada?: "true" | "false";
  loja?: string;
  de?: string;
  ate?: string;
  page?: number;
};

export type PaginaDeNotas = {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotaFiscal[];
};

/** Uma pagina por vez, com os filtros: a listagem pode passar de 50 notas
 *  facil, e quem le e a tela de classificacao, com paginador proprio — nao a
 *  soma de tudo, como no painel. */
export const getNotas = async (filtros: FiltroDeNotas = {}): Promise<PaginaDeNotas> => {
  const busca = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== "") busca.set(chave, String(valor));
  });
  const res = await apiV1(`/notas-fiscais/?${busca.toString()}`);
  return res.json();
};

/** Sobe o lote inteiro numa chamada: quem baixa do e-mail baixa o mes todo. */
export const importarNotas = async (arquivos: File[]): Promise<ResultadoDoLote> => {
  const corpo = new FormData();
  arquivos.forEach((arquivo) => corpo.append("arquivos", arquivo));

  const res = await apiV1("/notas-fiscais/importar/", { method: "POST", body: corpo });
  return res.json();
};

/** Classifica a nota num elemento do plano de contas. O backend ignora
 *  qualquer outro campo mandado aqui — numero, serie, data e valor sao a
 *  prova da despesa, e nao se corrigem por esta tela. */
export const classificarNota = async (
  id: string,
  elementoId: string | null,
): Promise<NotaFiscal> => {
  const res = await apiV1(`/notas-fiscais/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ elemento: elementoId }),
  });
  return res.json();
};

export const getGruposDeDespesa = async (): Promise<GrupoDeDespesa[]> => {
  const res = await apiV1("/grupos-de-despesa/");
  const dados = await res.json();
  return dados.results ?? dados;
};
