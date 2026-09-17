import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSalgadosDoPainel } from "@/features/catalogo/services/catalogo";
import { getFechamentosDoMes } from "@/features/fechamento/services/painel";

import { getTurnosDaData, lancarFechamentoPeloPainel } from "../services/reposicao";

export const useTurnosDaData = (data: string) =>
  useQuery({
    queryKey: ["admin", "turnos", data],
    queryFn: () => getTurnosDaData(data),
    // So pergunta depois que ha data escolhida; o campo comeca vazio.
    enabled: Boolean(data),
    // O calendario daquele dia nao muda enquanto a tela esta aberta — o unico
    // jeito de mudar seria a gerencia cadastrar um feriado local no meio do
    // preenchimento, que e o caso que nao vale uma rechecagem por foco.
    staleTime: 10 * 60 * 1000,
  });

/**
 * O caixa ja lancado no mes que o calendario esta mostrando.
 *
 * O mes inteiro numa chamada, e nao um dia por vez: e o que deixa o calendario
 * marcar de uma vez os dias com buraco — pedir dia a dia seriam 42 chamadas
 * para folhear um mes. Serve tambem para saber se o turno escolhido ja esta
 * ocupado, sem uma segunda busca.
 */
export const useFechamentosDoMes = (mes: string) =>
  useQuery({
    queryKey: ["admin", "fechamentos-do-mes", mes],
    queryFn: () => getFechamentosDoMes(mes),
    enabled: Boolean(mes),
  });

/**
 * O catalogo de salgados, para o seletor de desperdicio.
 *
 * Pelo login do painel, e nao pelo `useSalgados` do formulario: aquele pede com
 * o cookie do aparelho da loja. A chave e a mesma da tela de Catalogo, entao
 * cadastrar um item la ja aparece aqui.
 */
export const useSalgadosDoPainel = () =>
  useQuery({
    queryKey: ["catalogo", "salgados"],
    queryFn: getSalgadosDoPainel,
  });

export const useLancarFechamento = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: lancarFechamentoPeloPainel,
    // Um dia que estava vazio deixou de estar: o painel, os graficos e a
    // propria checagem de turno ocupado desta tela ficam velhos junto.
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ["admin", "fechamentos-do-mes"] });
      cliente.invalidateQueries({ queryKey: ["painel-caixa"] });
    },
  });
};
