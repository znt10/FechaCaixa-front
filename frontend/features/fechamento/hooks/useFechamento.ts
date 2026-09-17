import { useMutation, useQuery } from "@tanstack/react-query";

import {
  cancelarFechamentoDaLoja,
  getEncarregados,
  getFechamentoParaCorrigir,
  getLojasDoFormulario,
  getResponsaveisRetirada,
  getSalgados,
  getTurnosDoDia,
  patchFechamento,
  postFechamento,
} from "../services/fechamentos";
import type { FechamentoPayload } from "../services/fechamentos";
import { OPCOES_DAS_LISTAS_DO_FORMULARIO } from "../listas-do-formulario";

// A conta saiu das chaves de cache junto com o ?conta=: quem responde por
// estas listas e o cookie do aparelho, e um aparelho pertence a uma empresa so.
// Trocar de empresa no mesmo celular passa pela tela do codigo, que limpa o
// cache inteiro do formulario.
export const useLojasDoFormulario = () =>
  useQuery({
    queryKey: ["fechamento", "lojas"],
    queryFn: getLojasDoFormulario,
    ...OPCOES_DAS_LISTAS_DO_FORMULARIO,
  });

export const useResponsaveisRetirada = () =>
  useQuery({
    queryKey: ["fechamento", "responsaveis-retirada"],
    queryFn: getResponsaveisRetirada,
    ...OPCOES_DAS_LISTAS_DO_FORMULARIO,
  });

export const useEncarregados = () =>
  useQuery({
    queryKey: ["fechamento", "encarregados"],
    queryFn: getEncarregados,
    ...OPCOES_DAS_LISTAS_DO_FORMULARIO,
  });

export const useSalgados = () =>
  useQuery({
    queryKey: ["fechamento", "salgados"],
    queryFn: getSalgados,
    ...OPCOES_DAS_LISTAS_DO_FORMULARIO,
  });

export const useTurnosDoDia = () =>
  useQuery({
    queryKey: ["fechamento", "turnos"],
    queryFn: getTurnosDoDia,
    // Curto: quem deixa a tela aberta virando a noite tem que ver o dia novo.
    staleTime: 60 * 1000,
  });

export const useEnviarFechamento = () =>
  useMutation({ mutationFn: postFechamento });

/**
 * Correcao dentro dos 20 minutos.
 *
 * Sao mutations (e nao query + cache) porque as duas so acontecem por acao
 * explicita da funcionaria: buscar o lancamento e o clique em "Corrigir", e
 * reaproveitar uma copia em cache aqui seria justamente o risco de ela
 * corrigir por cima de um valor velho.
 */
export const useAbrirCorrecao = () =>
  useMutation({ mutationFn: getFechamentoParaCorrigir });

export const useCorrigirFechamento = () =>
  useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FechamentoPayload }) =>
      patchFechamento(id, payload),
  });

export const useCancelarFechamentoDaLoja = () =>
  useMutation({ mutationFn: cancelarFechamentoDaLoja });
