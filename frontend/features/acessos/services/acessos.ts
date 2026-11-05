import { apiV1 } from "@/shared/services/api";

/** Plataforma → Acessos: só o dono da plataforma (a API responde 403 aos outros). */

export type SituacaoDoGerente = "ATIVO" | "AGUARDANDO_SENHA" | "DESATIVADO";

export type GerenteDaEmpresa = {
  id: number;
  nome: string;
  email: string;
  situacao: SituacaoDoGerente;
};

/** O que a empresa contrata, mais a tela CPF (que o gerente também liga na
 *  tela Empresa); o resto o gerente liga lá. */
export type Modulos = {
  notas: boolean;
  banco: boolean;
  comprovantes: boolean;
  comprovantes_pessoais: boolean;
};

export type EmpresaComAcessos = {
  id: string;
  nome: string;
  ativo: boolean;
  modulos: Modulos;
  gerentes: GerenteDaEmpresa[];
};

/** Sem `senha`: o gerente recebe por e-mail o link para criar a dele. */
export type NovoGerente = { nome: string; email: string; senha?: string };

/** `null`: a senha foi dada, nenhum e-mail saiu. `false`: o e-mail falhou. */
export type EmailEnviado = boolean | null;

const BASE = "/plataforma/acessos/";

export const getAcessos = async (): Promise<EmpresaComAcessos[]> => {
  const res = await apiV1(BASE);
  return res.json();
};

export const criarEmpresa = async (entrada: {
  nome: string;
  modulos: Modulos;
  gerente: NovoGerente;
}): Promise<EmpresaComAcessos & { email_enviado: EmailEnviado }> => {
  const res = await apiV1(BASE, { method: "POST", body: JSON.stringify(entrada) });
  return res.json();
};

export const mudarModulos = async ({
  id,
  modulos,
}: {
  id: string;
  modulos: Partial<Modulos>;
}): Promise<EmpresaComAcessos> => {
  const res = await apiV1(`${BASE}${id}/`, { method: "PATCH", body: JSON.stringify(modulos) });
  return res.json();
};

export const adicionarGerente = async ({
  id,
  gerente,
}: {
  id: string;
  gerente: NovoGerente;
}): Promise<{ gerente: GerenteDaEmpresa; email_enviado: EmailEnviado }> => {
  const res = await apiV1(`${BASE}${id}/gerentes/`, {
    method: "POST",
    body: JSON.stringify(gerente),
  });
  return res.json();
};

export const reenviarLink = async ({
  id,
  userId,
}: {
  id: string;
  userId: number;
}): Promise<{ email_enviado: boolean }> => {
  const res = await apiV1(`${BASE}${id}/gerentes/${userId}/reenviar-link/`, { method: "POST" });
  return res.json();
};
