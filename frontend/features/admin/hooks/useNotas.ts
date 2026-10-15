import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  classificarNota,
  criarElementoDeDespesa,
  criarGrupoDeDespesa,
  getGruposDeDespesa,
  mudarElementoDeDespesa,
  mudarGrupoDeDespesa,
  getNotas,
  importarNotas,
  type FiltroDeNotas,
} from "../services/notas";

export const useNotas = (filtros: FiltroDeNotas = {}) =>
  useQuery({
    queryKey: ["admin", "notas", filtros],
    queryFn: () => getNotas(filtros),
    // Sem isto, cada clique em "Proximas" troca a tabela por "Carregando
    // notas..." e o proprio paginador some — some justamente o botao que a
    // pessoa acabou de apertar, e ela clica no vazio. Segurar a pagina
    // anterior deixa a troca continua.
    placeholderData: keepPreviousData,
  });

export const useGruposDeDespesa = () =>
  useQuery({
    queryKey: ["admin", "grupos-de-despesa"],
    queryFn: getGruposDeDespesa,
  });

/** Tudo de novo depois de mexer no plano: o mesmo plano alimenta o seletor
 *  das notas, o do extrato, o dos comprovantes e os nomes dos resumos. */
const useInvalidaTudo = () => {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries();
};

type MudancaNoPlano = { id: string; mudanca: { nome?: string; ativo?: boolean } };

export const useCriarGrupoDeDespesa = () => {
  const invalidar = useInvalidaTudo();
  return useMutation({ mutationFn: criarGrupoDeDespesa, onSuccess: invalidar });
};

export const useMudarGrupoDeDespesa = () => {
  const invalidar = useInvalidaTudo();
  return useMutation({
    mutationFn: ({ id, mudanca }: MudancaNoPlano) => mudarGrupoDeDespesa(id, mudanca),
    onSuccess: invalidar,
  });
};

export const useCriarElementoDeDespesa = () => {
  const invalidar = useInvalidaTudo();
  return useMutation({ mutationFn: criarElementoDeDespesa, onSuccess: invalidar });
};

export const useMudarElementoDeDespesa = () => {
  const invalidar = useInvalidaTudo();
  return useMutation({
    mutationFn: ({ id, mudanca }: MudancaNoPlano) => mudarElementoDeDespesa(id, mudanca),
    onSuccess: invalidar,
  });
};

export const useImportarNotas = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: importarNotas,
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ["admin", "notas"] });
    },
  });
};

export const useClassificarNota = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: ({ id, elementoId }: { id: string; elementoId: string | null }) =>
      classificarNota(id, elementoId),
    // Classificar muda a sugestao do fornecedor, e com ela o que as proximas
    // notas dele vao mostrar: a lista inteira fica velha, nao so a linha.
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ["admin", "notas"] });
    },
  });
};
