import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMinhaMensalidade, informarPagamento } from "../services/mensalidade";

export const useMinhaMensalidade = () =>
  useQuery({
    queryKey: ["mensalidade"],
    queryFn: getMinhaMensalidade,
    // Curto e ao voltar para a aba: quem pagou e teve o pagamento confirmado
    // não pode ficar olhando a tela de bloqueio por meia hora de cache.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

export const useInformarPagamento = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: informarPagamento,
    onSuccess: (mensalidade) => {
      cliente.setQueryData(["mensalidade"], mensalidade);
      // O aviso destrava o painel: as telas que falharam com 402 buscam de novo.
      cliente.invalidateQueries();
    },
  });
};
