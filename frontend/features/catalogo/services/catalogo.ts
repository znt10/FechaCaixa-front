import { apiV1 } from "@/shared/services/api";
import type { Salgado } from "@/features/fechamento/services/fechamentos";

/**
 * Uma categoria do catalogo de salgados, como o DRF devolve — snake_case cru,
 * seguindo o mesmo padrao de Salgado em fechamentos.ts.
 */
export type CategoriaDeSalgado = {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

const json = async (res: Response) => {
  const data = await res.json();
  // Compatível com resposta paginada do DRF e com array cru.
  return data.results ?? data;
};

export const getCategorias = async (): Promise<CategoriaDeSalgado[]> =>
  json(await apiV1("/categorias-de-salgado/"));

export const getSalgadosDoPainel = async (): Promise<Salgado[]> =>
  json(await apiV1("/salgados/"));

export const criarCategoria = async (nome: string) =>
  json(await apiV1("/categorias-de-salgado/", {
    method: "POST",
    body: JSON.stringify({ nome }),
  }));

export const criarSalgado = async (nome: string, categoria: string) =>
  json(await apiV1("/salgados/", {
    method: "POST",
    body: JSON.stringify({ nome, categoria }),
  }));

export const atualizarCategoria = async (
  id: string,
  campos: Partial<Pick<CategoriaDeSalgado, "nome" | "ativo" | "ordem">>,
) =>
  json(await apiV1(`/categorias-de-salgado/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(campos),
  }));

export const atualizarSalgado = async (
  id: string,
  campos: Partial<Pick<Salgado, "nome" | "ativo" | "categoria">>,
) =>
  json(await apiV1(`/salgados/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(campos),
  }));
