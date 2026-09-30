import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";

import { mostrarAbasDoBanco } from "../banco-da-tela";
import {
  classificarTransacao,
  criarCategoriaDeMovimento,
  criarContaBancaria,
  getCategoriasDeMovimento,
  getContasBancarias,
  getResumoDoExtrato,
  getTransacoes,
  importarExtrato,
  mudarCategoriaDeMovimento,
  mudarContaBancaria,
  type Classificacao,
  type FiltroDeTransacoes,
  type NovaContaBancaria,
} from "../services/banco";

/** Toda consulta do módulo mora embaixo desta chave: importar ou classificar
 *  muda lista, resumo e regras de uma vez, e invalidar a raiz pega todas. */
const RAIZ = "banco";

export const useAbasDoBanco = () => {
  const usuario = useUsuarioAtual();
  return {
    ativo: mostrarAbasDoBanco({
      usuario: usuario.data,
      carregando: usuario.isPending,
      falhou: usuario.isError,
    }),
  };
};

export const useContasBancarias = () =>
  useQuery({ queryKey: [RAIZ, "contas"], queryFn: getContasBancarias });

export const useCategoriasDeMovimento = () =>
  useQuery({ queryKey: [RAIZ, "categorias"], queryFn: getCategoriasDeMovimento });

export const useTransacoes = (filtros: FiltroDeTransacoes) =>
  useQuery({
    queryKey: [RAIZ, "transacoes", filtros],
    queryFn: () => getTransacoes(filtros),
    // Mesma razão da lista de notas: sem isto, "Próximas" troca a tabela por
    // "Carregando..." e o paginador some debaixo do clique.
    placeholderData: keepPreviousData,
  });

export const useResumoDoExtrato = (filtros: Parameters<typeof getResumoDoExtrato>[0]) =>
  useQuery({
    queryKey: [RAIZ, "resumo", filtros],
    queryFn: () => getResumoDoExtrato(filtros),
    placeholderData: keepPreviousData,
  });

const useInvalidaOBanco = () => {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: [RAIZ] });
};

export const useImportarExtrato = () => {
  const invalidar = useInvalidaOBanco();
  return useMutation({ mutationFn: importarExtrato, onSuccess: invalidar });
};

export const useClassificarTransacao = () => {
  const invalidar = useInvalidaOBanco();
  return useMutation({
    mutationFn: ({ id, classificacao }: { id: string; classificacao: Classificacao }) =>
      classificarTransacao(id, classificacao),
    // A lista inteira fica velha, e nao so a linha: "aplicar as iguais" mexe
    // em outras, e o resumo muda de categoria.
    onSuccess: invalidar,
  });
};

export const useCriarContaBancaria = () => {
  const invalidar = useInvalidaOBanco();
  return useMutation({
    mutationFn: (conta: NovaContaBancaria) => criarContaBancaria(conta),
    onSuccess: invalidar,
  });
};

export const useMudarContaBancaria = () => {
  const invalidar = useInvalidaOBanco();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      mudarContaBancaria(id, { ativo }),
    onSuccess: invalidar,
  });
};

export const useCriarCategoriaDeMovimento = () => {
  const invalidar = useInvalidaOBanco();
  return useMutation({ mutationFn: criarCategoriaDeMovimento, onSuccess: invalidar });
};

export const useMudarCategoriaDeMovimento = () => {
  const invalidar = useInvalidaOBanco();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      mudarCategoriaDeMovimento(id, { ativo }),
    onSuccess: invalidar,
  });
};
