import { apiV1 } from "@/shared/services/api";

// ======================================================
// 🔹 COMPROVANTES (Gerência)
// ======================================================
// O gasto sem nota: o comprovante que o app do banco gera. Chega por e-mail
// (lido sozinho) ou pelo botão "Enviar comprovante" (lido na hora e conferido
// por quem enviou). Só o que está OK soma.

export type Situacao = "OK" | "CONFERIR" | "DESCARTADO";

export type Comprovante = {
  id: string;
  situacao: Situacao;
  motivo: string;
  origem: "EMAIL" | "SITE";
  /** Gasto pessoal (tela CPF): nunca soma em loja nem na empresa. */
  pessoal: boolean;
  valor: string | null;
  data_hora: string | null;
  id_transacao: string | null;
  pagador_nome: string;
  pagador_documento: string;
  pagador_banco: string;
  recebedor_nome: string;
  recebedor_documento: string;
  recebedor_banco: string;
  loja: string | null;
  loja_nome: string | null;
  elemento: string | null;
  elemento_nome: string | null;
  arquivo_nome: string;
  arquivo_tipo: string;
  tem_arquivo: boolean;
  remetente: string;
  created_at: string;
};

export type TotaisDeComprovantes = {
  valor: string;
  conferir: number;
  por_loja: { loja: string | null; nome: string; valor: string }[];
};

export type PaginaDeComprovantes = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Comprovante[];
  totais: TotaisDeComprovantes;
};

export type FiltroDeComprovantes = {
  de?: string;
  ate?: string;
  /** UUID da loja, ou "sem". */
  loja?: string;
  situacao?: Situacao;
  page?: number;
  /** Só os pessoais (tela CPF). Ausente: só os das lojas. */
  pessoal?: boolean;
};

export type EdicaoDeComprovante = Partial<{
  valor: string;
  data_hora: string;
  recebedor_nome: string;
  loja: string | null;
  elemento: string | null;
  pessoal: boolean;
}>;

export type Remetente = { id: string; email: string };

export type ConfiguracaoDosComprovantes = {
  endereco: string;
  endereco_pessoal: string;
  leitura_ligada: boolean;
};

const BASE = "/comprovantes/";

/** A query string da lista. `pessoal` vai como `1`, que é o que a API entende. */
export const parametrosDoFiltro = (filtro: FiltroDeComprovantes): string => {
  const params = new URLSearchParams();
  Object.entries(filtro).forEach(([chave, valor]) => {
    if (valor === undefined || valor === "" || valor === false) return;
    params.set(chave, valor === true ? "1" : String(valor));
  });
  return params.toString();
};

export const getComprovantes = async (
  filtro: FiltroDeComprovantes,
): Promise<PaginaDeComprovantes> => {
  const res = await apiV1(`${BASE}?${parametrosDoFiltro(filtro)}`);
  return res.json();
};

export const editarComprovante = async (
  id: string,
  edicao: EdicaoDeComprovante,
): Promise<Comprovante> => {
  const res = await apiV1(`${BASE}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(edicao),
  });
  return res.json();
};

export const confirmarComprovante = async (id: string): Promise<Comprovante> => {
  const res = await apiV1(`${BASE}${id}/confirmar/`, { method: "POST" });
  return res.json();
};

export const descartarComprovante = async (id: string): Promise<Comprovante> => {
  const res = await apiV1(`${BASE}${id}/descartar/`, { method: "POST" });
  return res.json();
};

export const voltarParaConferir = async (id: string): Promise<Comprovante> => {
  const res = await apiV1(`${BASE}${id}/voltar-para-conferir/`, { method: "POST" });
  return res.json();
};

export const enviarComprovante = async ({
  arquivo,
  loja,
  pessoal,
}: {
  arquivo: File;
  loja?: string;
  pessoal?: boolean;
}): Promise<Comprovante> => {
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  if (loja) corpo.append("loja", loja);
  if (pessoal) corpo.append("pessoal", "true");
  const res = await apiV1(`${BASE}enviar/`, { method: "POST", body: corpo });
  return res.json();
};

/** O arquivo abre direto no navegador: o cookie de sessão vai junto, porque o
 *  `/backend` é do mesmo domínio (ver `shared/services/api.ts`). */
export const urlDoArquivo = (id: string) => `/backend/api/v1${BASE}${id}/arquivo/`;

export const getConfiguracao = async (): Promise<ConfiguracaoDosComprovantes> => {
  const res = await apiV1(`${BASE}configuracao/`);
  return res.json();
};

export const getRemetentes = async (): Promise<Remetente[]> => {
  const res = await apiV1("/remetentes-de-comprovante/");
  return res.json();
};

export const criarRemetente = async (email: string): Promise<Remetente> => {
  const res = await apiV1("/remetentes-de-comprovante/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res.json();
};

export const apagarRemetente = async (id: string): Promise<void> => {
  await apiV1(`/remetentes-de-comprovante/${id}/`, { method: "DELETE" });
};
