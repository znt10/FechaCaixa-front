import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";

import { mostrarAreaDeComprovantes } from "../comprovantes-da-tela";
import {
  apagarRemetente,
  confirmarComprovante,
  criarRemetente,
  descartarComprovante,
  editarComprovante,
  enviarComprovante,
  getComprovantes,
  getConfiguracao,
  getRemetentes,
  type EdicaoDeComprovante,
  type FiltroDeComprovantes,
} from "../services/comprovantes";

/** Toda consulta do módulo mora embaixo desta chave: confirmar ou editar muda
 *  lista e totais de uma vez, e invalidar a raiz pega os dois. */
const RAIZ = "comprovantes";

export const useComprovantes = (filtro: FiltroDeComprovantes) =>
  useQuery({
    queryKey: [RAIZ, "lista", filtro],
    queryFn: () => getComprovantes(filtro),
    placeholderData: keepPreviousData,
  });

const useMudanca = <Entrada, Saida>(acao: (entrada: Entrada) => Promise<Saida>) => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: acao,
    onSuccess: () => cliente.invalidateQueries({ queryKey: [RAIZ] }),
  });
};

export const useEditarComprovante = () =>
  useMudanca(({ id, edicao }: { id: string; edicao: EdicaoDeComprovante }) =>
    editarComprovante(id, edicao),
  );

export const useConfirmarComprovante = () => useMudanca(confirmarComprovante);
export const useDescartarComprovante = () => useMudanca(descartarComprovante);
export const useEnviarComprovante = () => useMudanca(enviarComprovante);

export const useAreaDeComprovantes = () => {
  const usuario = useUsuarioAtual();
  return {
    ativo: mostrarAreaDeComprovantes({
      usuario: usuario.data,
      carregando: usuario.isPending,
      falhou: usuario.isError,
    }),
  };
};

export const useConfiguracao = () =>
  useQuery({ queryKey: [RAIZ, "configuracao"], queryFn: getConfiguracao });

export const useRemetentes = () =>
  useQuery({ queryKey: [RAIZ, "remetentes"], queryFn: getRemetentes });

export const useCriarRemetente = () => useMudanca(criarRemetente);
export const useApagarRemetente = () => useMudanca(apagarRemetente);
