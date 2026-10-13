import { apiV1 } from "@/shared/services/api";

// ======================================================
// 🔹 MENSALIDADE (empresa) e PLATAFORMA (dono)
// ======================================================
// A regra mora no backend (services/mensalidade/situacao.py): aqui só se lê
// a situação pronta e se desenha.

export type SituacaoDaMensalidade =
  | "DESATIVADA"
  | "ISENTA"
  | "AGUARDANDO"
  | "EM_DIA"
  | "VENCENDO"
  | "ATRASADA"
  | "BLOQUEADA";

/** O que a empresa vê. Superusuário e login sem empresa recebem só `situacao`. */
export type MinhaMensalidade = {
  situacao: SituacaoDaMensalidade;
  valor?: string;
  paga_ate?: string;
  dias?: number | null;
  bloqueia_em?: string | null;
  aguardando?: { informado_em: string } | null;
  pode_informar?: boolean;
  /** `qr_svg` é um data URI, pronto para o `src` de um <img>. */
  pix?: { copia_e_cola: string; qr_svg: string } | null;
};

export type EmpresaDaPlataforma = {
  id: string;
  nome: string;
  ativo: boolean;
  situacao: SituacaoDaMensalidade;
  valor_mensal: string | null;
  paga_ate: string | null;
  isenta: boolean;
  nunca_bloquear: boolean;
  aguardando: {
    id: string;
    valor: string;
    informado_em: string;
    informado_por: string | null;
  } | null;
  ultimo_pagamento: { valor: string; resolvido_em: string; origem: string } | null;
};

export type PainelDaPlataforma = {
  empresas: EmpresaDaPlataforma[];
  contadores: { aguardando: number; atrasadas: number; bloqueadas: number };
};

export type MudancaDaEmpresa = Partial<{
  valor_mensal: string;
  isenta: boolean;
  nunca_bloquear: boolean;
  ativo: boolean;
  paga_ate: string;
}>;

export type NovoPagamento = { paga_ate: string; valor: string; observacao: string };

export const getMinhaMensalidade = async (): Promise<MinhaMensalidade> => {
  const res = await apiV1("/minha-mensalidade/");
  return res.json();
};

export const informarPagamento = async (): Promise<MinhaMensalidade> => {
  const res = await apiV1("/minha-mensalidade/ja-paguei/", { method: "POST" });
  return res.json();
};

export const getPainelDaPlataforma = async (): Promise<PainelDaPlataforma> => {
  const res = await apiV1("/plataforma/empresas/");
  return res.json();
};

export const mudarEmpresa = async (
  id: string,
  mudanca: MudancaDaEmpresa,
): Promise<EmpresaDaPlataforma> => {
  const res = await apiV1(`/plataforma/empresas/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(mudanca),
  });
  return res.json();
};

export const registrarPagamento = async (
  id: string,
  dados: NovoPagamento,
): Promise<EmpresaDaPlataforma> => {
  const res = await apiV1(`/plataforma/empresas/${id}/registrar-pagamento/`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
  return res.json();
};

export const confirmarPagamento = async (id: string): Promise<EmpresaDaPlataforma> => {
  const res = await apiV1(`/plataforma/pagamentos/${id}/confirmar/`, { method: "POST" });
  return res.json();
};

export const recusarPagamento = async (id: string): Promise<EmpresaDaPlataforma> => {
  const res = await apiV1(`/plataforma/pagamentos/${id}/recusar/`, { method: "POST" });
  return res.json();
};
