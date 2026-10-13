import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmarPagamento,
  getPainelDaPlataforma,
  mudarEmpresa,
  recusarPagamento,
  registrarPagamento,
  type MudancaDaEmpresa,
  type NovoPagamento,
} from "../services/mensalidade";

const CHAVE = ["plataforma"];

export const usePainelDaPlataforma = () =>
  useQuery({ queryKey: CHAVE, queryFn: getPainelDaPlataforma, refetchOnWindowFocus: true });

/** Toda ação da Plataforma muda a situação e os contadores: relê a lista. */
const useAcaoDaPlataforma = <T>(acao: (entrada: T) => Promise<unknown>) => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: acao,
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }),
  });
};

export const useMudarEmpresa = () =>
  useAcaoDaPlataforma(({ id, mudanca }: { id: string; mudanca: MudancaDaEmpresa }) =>
    mudarEmpresa(id, mudanca),
  );

export const useRegistrarPagamento = () =>
  useAcaoDaPlataforma(({ id, dados }: { id: string; dados: NovoPagamento }) =>
    registrarPagamento(id, dados),
  );

export const useConfirmarPagamento = () => useAcaoDaPlataforma(confirmarPagamento);

export const useRecusarPagamento = () => useAcaoDaPlataforma(recusarPagamento);
