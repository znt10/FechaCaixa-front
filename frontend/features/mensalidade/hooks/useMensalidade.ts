import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  gerarLinkDePagamento,
  getMinhaMensalidade,
  informarPagamento,
} from "../services/mensalidade";

/** O mesmo ritmo na tela da loja e na Plataforma. */
export const INTERVALO_DA_MENSALIDADE = 15 * 1000;

/**
 * A mensalidade muda fora desta tela: o dono marca a empresa na Plataforma,
 * ou a InfinitePay confirma o pagamento numa aba ao lado. Por isso a cópia
 * nunca vale como fresca, voltar para a aba relê, e a tela aberta se relê a
 * cada 15 s (só com a aba visível: escondida, o foco de volta já relê).
 */
export const opcoesDaMinhaMensalidade = {
  queryKey: ["mensalidade"],
  queryFn: getMinhaMensalidade,
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchInterval: INTERVALO_DA_MENSALIDADE,
  refetchIntervalInBackground: false,
  retry: false,
} as const;

export const useMinhaMensalidade = () => useQuery(opcoesDaMinhaMensalidade);

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

/** O "Pagar mensalidade": o retrato volta já com o `link`. */
export const useGerarLink = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: gerarLinkDePagamento,
    onSuccess: (mensalidade) => cliente.setQueryData(["mensalidade"], mensalidade),
  });
};
