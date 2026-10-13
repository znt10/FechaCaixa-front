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
};

export type EdicaoDeComprovante = Partial<{
  valor: string;
  data_hora: string;
  recebedor_nome: string;
  loja: string | null;
  elemento: string | null;
}>;

export type Remetente = { id: string; email: string };

export type ConfiguracaoDosComprovantes = { endereco: string; leitura_ligada: boolean };

const BASE = "/comprovantes/";

export const getComprovantes = async (
  filtro: FiltroDeComprovantes,
): Promise<PaginaDeComprovantes> => {
  const params = new URLSearchParams();
  Object.entries(filtro).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== "") params.set(chave, String(valor));
  });
  const res = await apiV1(`${BASE}?${params.toString()}`);
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

export const enviarComprovante = async ({
  arquivo,
  loja,
}: {
  arquivo: File;
  loja?: string;
}): Promise<Comprovante> => {
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  if (loja) corpo.append("loja", loja);
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
