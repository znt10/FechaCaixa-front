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

/**
 * A lista das empresas, sempre relida.
 *
 * O painel guarda as respostas por 5 minutos (staleTime do providers.tsx) e
 * leva a copia ate atraves do F5: a empresa apertava "Ja paguei" e o dono so
 * via depois de sair e entrar de novo. Aqui a copia nunca vale como fresca —
 * abrir a tela e voltar para a aba releem — e a lista se rele sozinha a cada
 * 10 minutos, para a tela esquecida aberta. O botao "Atualizar" e o resto.
 */
export const usePainelDaPlataforma = () =>
  useQuery({
    queryKey: CHAVE,
    queryFn: getPainelDaPlataforma,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10 * 60 * 1000,
  });

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
