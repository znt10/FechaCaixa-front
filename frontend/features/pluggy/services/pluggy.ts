import { apiV1 } from "@/shared/services/api";

// ======================================================
// 🔹 PLUGGY (plataforma, só o dono)
// ======================================================
// A regra de "caiu" mora no backend; aqui só se lê o estado pronto.

export type EstadoDaConexao = "CONFIGURANDO" | "ATIVA" | "COM_ERRO" | "DESLIGADA";

export type ContaDaConexao = {
  id: string;
  numero: string;
  banco_nome: string;
  /** Nome da loja (texto), não o objeto. */
  loja: string;
};

export type ConexaoPluggy = {
  id: string;
  empresa: { id: string; nome: string };
  email: string;
  estado: EstadoDaConexao;
  client_id: string;
  segredo_salvo_em: string | null;
  item_ids: string;
  conectada_em: string | null;
  ultima_busca_ok_em: string | null;
  ultimo_erro: string;
  contas: ContaDaConexao[];
};

export type PainelDaPluggy = {
  contadores: { funcionando: number; caidas: number; configurando: number };
  conexoes: ConexaoPluggy[];
};

/** Uma conta que a Pluggy enxerga, com a conta bancária que o sistema sugere. */
export type ContaDaPluggy = {
  pluggy_account_id: string;
  numero: string;
  nome: string;
  conta_bancaria_sugerida: string | null;
};

export type ResultadoDoTeste = {
  contas: ContaDaPluggy[];
  contas_da_empresa: ContaDaConexao[];
};

export type Vinculo = { pluggy_account_id: string; conta_bancaria_id: string };

export type NovaConexao = {
  empresa_id: string;
  client_id: string;
  client_secret: string;
  item_ids: string;
  email?: string;
};

export type MudancaDaConexao = Partial<{
  client_id: string;
  client_secret: string;
  item_ids: string;
  email: string;
  estado: EstadoDaConexao;
}>;

export const getPainelDaPluggy = async (): Promise<PainelDaPluggy> => {
  const res = await apiV1("/plataforma/pluggy/");
  return res.json();
};

export const criarConexao = async (dados: NovaConexao): Promise<ConexaoPluggy> => {
  const res = await apiV1("/plataforma/pluggy/", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  return res.json();
};

export const mudarConexao = async (
  id: string,
  mudanca: MudancaDaConexao,
): Promise<ConexaoPluggy> => {
  const res = await apiV1(`/plataforma/pluggy/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(mudanca),
  });
  return res.json();
};

export const testarConexao = async (id: string): Promise<ResultadoDoTeste> => {
  const res = await apiV1(`/plataforma/pluggy/${id}/testar/`, { method: "POST" });
  return res.json();
};

export const vincularContas = async (id: string, vinculos: Vinculo[]): Promise<ConexaoPluggy> => {
  const res = await apiV1(`/plataforma/pluggy/${id}/vincular/`, {
    method: "POST",
    body: JSON.stringify({ vinculos }),
  });
  return res.json();
};

export const buscarAgora = async (id: string): Promise<ConexaoPluggy> => {
  const res = await apiV1(`/plataforma/pluggy/${id}/buscar/`, { method: "POST" });
  return res.json();
};
