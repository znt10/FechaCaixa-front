import type { ConfiguracaoDoFormulario } from "@/features/fechamento/formulario-da-empresa";

import { apiV1Publico } from "@/shared/services/api";

// O formulario deixou de ser aberto. Quem da o direito de lancar e o aparelho:
// ele digita o codigo da empresa uma vez, o backend devolve um cookie httpOnly
// de 180 dias, e a empresa passa a sair desse cookie — nunca mais da URL.

/** O que o formulario precisa saber da empresa dona deste aparelho. */
export type Empresa = ConfiguracaoDoFormulario & {
  nome: string;
  /** O endereco publico da empresa: /primavera. E para la que o aparelho vai
   *  depois de digitar o codigo. */
  slug: string;
  fechamentos_por_dia: 1 | 2;
};

/**
 * Para onde mandar o aparelho depois de entrar.
 *
 * Nunca monta `/${slug}` na mao: quando o backend respondeu sem o slug (versao
 * mais antiga no ar, campo renomeado), a interpolacao mandava o formulario
 * inteiro para /undefined — uma tela em branco que nao diz o que aconteceu.
 * Sem slug, a porta e o lugar certo para voltar.
 */
export const enderecoDaEmpresa = (empresa?: Empresa | null) =>
  empresa?.slug ? `/${empresa.slug}` : "/fechamento";

/**
 * Troca o codigo da empresa pelo acesso deste aparelho.
 *
 * O token volta como cookie httpOnly — o JavaScript desta pagina nunca ve o
 * valor, e por isso nao ha nada aqui para guardar em localStorage.
 */
export const entrarComCodigo = async (dados: {
  codigo: string;
  /** Opcional: sem ele o backend batiza o aparelho pelo navegador. A loja tem
   *  um celular so, e a pergunta nao paga o atrito no fim do expediente. */
  apelido?: string;
}): Promise<Empresa> => {
  const res = await apiV1Publico("/formulario/acesso/", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  const { empresa } = await res.json();
  return empresa;
};

/** Quem e a empresa deste aparelho. Erro aqui significa "sem acesso". */
export const getEmpresaDoFormulario = async (): Promise<Empresa> => {
  const res = await apiV1Publico("/formulario/empresa/");
  return res.json();
};

/** Desconecta este aparelho. O backend revoga e apaga o cookie. */
export const sairDoFormulario = async (): Promise<void> => {
  await apiV1Publico("/formulario/sair/", { method: "POST" });
};
