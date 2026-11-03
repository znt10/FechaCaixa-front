import { apiV1, apiV1Publico } from "@/shared/services/api";

// ======================================================
// 🔹 BOLETOS A PAGAR
// ======================================================
// O boleto ou conta que chega na loja para pagar depois. A loja fotografa no
// fechamento (formulário público, cookie do aparelho); a gerência vê o
// vencimento no painel, copia a linha digitável e marca como pago.

export type SituacaoDoBoleto = "A_PAGAR" | "PAGO" | "DESCARTADO";

export type Boleto = {
  id: string;
  loja: string | null;
  loja_nome: string | null;
  origem: "FORMULARIO" | "PAINEL";
  situacao: SituacaoDoBoleto;
  conferir: boolean;
  /** AAAA-MM-DD; null é "sem data". */
  vencimento: string | null;
  valor: string | null;
  beneficiario_nome: string;
  beneficiario_documento: string;
  /** Só dígitos, e só quando passou nos verificadores. */
  linha_digitavel: string;
  descricao: string;
  arquivo_tipo: string;
  arquivo_nome: string;
  tem_arquivo: boolean;
  created_at: string;
  pago_em: string | null;
  pago_por_nome: string | null;
};

/** Faixas que não se sobrepõem; `aviso` é a soma das cinco. */
export type ResumoDosBoletos = {
  sem_data: number;
  vencidos: number;
  hoje: number;
  em_3_dias: number;
  em_7_dias: number;
  aviso: number;
};

export type NovoBoleto = {
  arquivo: File;
  loja?: string;
  /** AAAA-MM-DD. */
  vencimento?: string;
  /** "230.00". */
  valor?: string;
};

export type EdicaoDoBoleto = Partial<
  Pick<Boleto, "vencimento" | "valor" | "beneficiario_nome" | "descricao" | "loja">
>;

const BASE = "/boletos/";

const corpoDoBoleto = ({ arquivo, loja, vencimento, valor }: NovoBoleto) => {
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  if (loja) corpo.append("loja", loja);
  if (vencimento) corpo.append("vencimento", vencimento);
  if (valor) corpo.append("valor", valor);
  return corpo;
};

export const enviarBoletoDaLoja = async (novo: NovoBoleto): Promise<Boleto> => {
  const res = await apiV1Publico("/formulario/boletos/", {
    method: "POST",
    body: corpoDoBoleto(novo),
  });
  return res.json();
};

export const enviarBoletoDoPainel = async (novo: NovoBoleto): Promise<Boleto> => {
  const res = await apiV1(BASE, { method: "POST", body: corpoDoBoleto(novo) });
  return res.json();
};

export const listarBoletos = async (situacao: "A_PAGAR" | "PAGO"): Promise<Boleto[]> => {
  const res = await apiV1(`${BASE}?situacao=${situacao}`);
  return res.json();
};

export const resumoDosBoletos = async (): Promise<ResumoDosBoletos> => {
  const res = await apiV1(`${BASE}resumo/`);
  return res.json();
};

export const editarBoleto = async (id: string, campos: EdicaoDoBoleto): Promise<Boleto> => {
  const res = await apiV1(`${BASE}${id}/`, { method: "PATCH", body: JSON.stringify(campos) });
  return res.json();
};

const acao = (nome: string) => async (id: string): Promise<Boleto> => {
  const res = await apiV1(`${BASE}${id}/${nome}/`, { method: "POST" });
  return res.json();
};

export const pagarBoleto = acao("pagar");
export const desfazerPagamento = acao("desfazer_pagamento");
export const descartarBoleto = acao("descartar");

/** O arquivo abre direto no navegador: o cookie de sessão vai junto, porque o
 *  `/backend` é do mesmo domínio (ver `shared/services/api.ts`). */
export const urlDoArquivo = (id: string) => `/backend/api/v1${BASE}${id}/arquivo/`;
