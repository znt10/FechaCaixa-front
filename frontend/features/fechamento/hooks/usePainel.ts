import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelarFechamentoDoPainel,
  conferirFechamento,
  getFechamentosDoDia,
  getFechamentosDoIntervalo,
  getFechamentosDoMes,
  getLojasDoPainel,
  getQuemConsomeDoPainel,
  getResponsaveisDoPainel,
  patchFechamento,
  type CamposEditaveis,
} from "../services/painel";

export type Visao = "DIARIO" | "MENSAL";

// De quanto em quanto tempo o painel pergunta de novo. E uma tela de
// acompanhamento: o gerente deixa ela aberta esperando as lojas fecharem, e
// um lancamento que so aparece no proximo F5 nao serve.
const INTERVALO_DE_ATUALIZACAO = 30 * 1000;

export const useLojasDoPainel = () =>
  useQuery({
    queryKey: ["painel-caixa", "lojas"],
    queryFn: getLojasDoPainel,
    // Cadastro de loja muda raro, mas nao pode ficar preso: loja nova tem que
    // aparecer na lista sem ninguem reiniciar nada.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

/**
 * Uma consulta so para as duas abas: a chave muda junto com a visao e a
 * referencia, entao trocar de aba ou de dia nao mistura o cache de uma com a
 * outra — e voltar para um dia ja visto e instantaneo.
 */
export const useFechamentosDoPainel = (visao: Visao, referencia: string) =>
  useQuery({
    queryKey: ["painel-caixa", "fechamentos", visao, referencia],
    queryFn: () =>
      visao === "DIARIO"
        ? getFechamentosDoDia(referencia)
        : getFechamentosDoMes(referencia),
    // O padrao do projeto (5 minutos) atrasava demais: um fechamento feito no
    // celular da loja demorava esse tanto para aparecer aqui, inclusive depois
    // de recarregar a pagina, porque o cache e persistido na sessao.
    //
    // Ja foi zero, e ai o dado nascia velho: trocar de tela (as quatro do
    // painel pedem o mesmo intervalo) refazia a consulta que tinha acabado de
    // voltar. Igual ao intervalo, ninguem ve dado mais velho do que ja veria —
    // e o intervalo continua sendo quem mantem a tela fresca.
    staleTime: INTERVALO_DE_ATUALIZACAO,
    refetchInterval: INTERVALO_DE_ATUALIZACAO,
    // Sem isso o intervalo continua rodando com a aba escondida, gastando
    // rede a noite inteira sem ninguem olhando.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

export const useFechamentosDoIntervalo = (de: string, ate: string) =>
  useQuery({
    queryKey: ["painel-caixa", "intervalo", de, ate],
    queryFn: () => getFechamentosDoIntervalo(de, ate),
    // Mesma conta da consulta acima: /saidas e /graficos abrem no mesmo
    // periodo, entao ir de uma para a outra caia direto neste refetch.
    staleTime: INTERVALO_DE_ATUALIZACAO,
    refetchInterval: INTERVALO_DE_ATUALIZACAO,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

export const useConferirFechamento = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: conferirFechamento,
    // Recarrega a listagem inteira em vez de remendar a linha: o mesmo turno
    // pode estar aberto noutra aba, e o estado de conferido e o que a gerencia
    // usa para saber o que falta olhar.
    onSuccess: () =>
      cliente.invalidateQueries({ queryKey: ["painel-caixa", "fechamentos"] }),
  });
};

export const useResponsaveisDoPainel = () =>
  useQuery({
    queryKey: ["painel-caixa", "responsaveis"],
    queryFn: getResponsaveisDoPainel,
    // Cadastro de quem pode retirar muda raro; a tela de edicao abre varias
    // vezes seguidas e nao precisa perguntar de novo a cada loja.
    staleTime: 5 * 60 * 1000,
  });

export const useQuemConsomeDoPainel = () =>
  useQuery({
    queryKey: ["painel-caixa", "quem-consome"],
    queryFn: getQuemConsomeDoPainel,
    // Mesmo motivo do de cima: cadastro de gente muda raro.
    staleTime: 5 * 60 * 1000,
  });

export const useEditarFechamento = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: CamposEditaveis }) =>
      patchFechamento(id, campos),
    // Invalida o ramo inteiro: o mesmo turno aparece no painel, nos graficos e
    // aqui, e um valor corrigido numa tela nao pode continuar velho nas outras.
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["painel-caixa"] }),
  });
};

export const useCancelarFechamentoDoPainel = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: cancelarFechamentoDoPainel,
    // O mesmo turno aparece no painel, nos graficos e nas saidas: cancelar
    // muda os tres, e o total do periodo junto.
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ["painel-caixa"] });
    },
  });
};
