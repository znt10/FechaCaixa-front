import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { atualizarAposEditarEmpresa } from "../cache-da-empresa";
import {
  apagarFuncionario,
  apagarLoja,
  criarFuncionario,
  criarLoja,
  criarEncarregado,
  criarResponsavel,
  desativarEncarregado,
  desativarResponsavel,
  editarEncarregado,
  editarLoja,
  gerarNovoCodigo,
  definirAtivoDaLoja,
  definirAtivoDoFuncionario,
  getEncarregados,
  getFuncionarios,
  reativarEncarregado,
  getLojasDaEmpresa,
  getMinhaEmpresa,
  getResponsaveis,
  patchMinhaEmpresa,
} from "../services/empresa";

export const useMinhaEmpresa = () =>
  useQuery({ queryKey: ["admin", "minha-empresa"], queryFn: getMinhaEmpresa });

/** A empresa fecha o caixa uma vez por dia. E o que decide se o turno do dia
 *  inteiro se chama "Dia" (o caixa de todo dia) ou "Feriado" (o unico dia em
 *  que a empresa de manha e tarde fecha uma vez so). Mesma consulta da tela da
 *  empresa: o cache e um so, e nenhum componente que pergunta faz outra busca. */
export const useUmFechamentoPorDia = () =>
  useMinhaEmpresa().data?.fechamentos_por_dia === 1;

export const useResponsaveis = () =>
  useQuery({ queryKey: ["admin", "responsaveis"], queryFn: getResponsaveis });

export const useEditarEmpresa = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: patchMinhaEmpresa,
    onSuccess: () => atualizarAposEditarEmpresa(cliente),
  });
};

export const useGerarNovoCodigo = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: gerarNovoCodigo,
    // O codigo novo derruba os aparelhos conectados no mesmo request.
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["admin"] }),
  });
};

export const useCriarResponsavel = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: criarResponsavel,
    // Aparece no formulario da loja e no seletor da tela de correcao.
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ["admin", "responsaveis"] });
      cliente.invalidateQueries({ queryKey: ["painel-caixa", "responsaveis"] });
    },
  });
};

export const useDesativarResponsavel = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: desativarResponsavel,
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ["admin", "responsaveis"] });
      cliente.invalidateQueries({ queryKey: ["painel-caixa", "responsaveis"] });
    },
  });
};

export const useEncarregados = () =>
  useQuery({ queryKey: ["admin", "encarregados"], queryFn: getEncarregados });

/** A lista aparece em tres lugares: aqui, no formulario da loja e no seletor
 *  da tela de correcao. Cadastrar alguem tem que alcancar os tres. */
const invalidarEncarregados = (cliente: ReturnType<typeof useQueryClient>) => {
  cliente.invalidateQueries({ queryKey: ["admin", "encarregados"] });
  cliente.invalidateQueries({ queryKey: ["fechamento", "encarregados"] });
};

export const useCriarEncarregado = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: criarEncarregado,
    onSuccess: () => invalidarEncarregados(cliente),
  });
};

export const useEditarEncarregado = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: editarEncarregado,
    onSuccess: () => invalidarEncarregados(cliente),
  });
};

export const useReativarEncarregado = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: reativarEncarregado,
    onSuccess: () => invalidarEncarregados(cliente),
  });
};

export const useDesativarEncarregado = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: desativarEncarregado,
    onSuccess: () => invalidarEncarregados(cliente),
  });
};

export const useFuncionarios = () =>
  useQuery({ queryKey: ["admin", "funcionarios"], queryFn: getFuncionarios });

const invalidarFuncionarios = (cliente: ReturnType<typeof useQueryClient>) =>
  cliente.invalidateQueries({ queryKey: ["admin", "funcionarios"] });

export const useCriarFuncionario = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: criarFuncionario,
    onSuccess: () => invalidarFuncionarios(cliente),
  });
};

export const useDefinirAtivoDoFuncionario = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: definirAtivoDoFuncionario,
    onSuccess: () => invalidarFuncionarios(cliente),
  });
};

export const useApagarFuncionario = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: apagarFuncionario,
    // O painel mostra quem conferiu cada turno; apagar deixa esses turnos sem
    // nome, entao o ramo do painel envelhece junto.
    onSuccess: () => {
      invalidarFuncionarios(cliente);
      cliente.invalidateQueries({ queryKey: ["painel-caixa"] });
    },
  });
};

export const useLojasDaEmpresa = () =>
  useQuery({ queryKey: ["admin", "lojas"], queryFn: getLojasDaEmpresa });

/** Mexer em loja envelhece o painel inteiro: ele e uma linha por loja. */
const invalidarLojas = (cliente: ReturnType<typeof useQueryClient>) => {
  cliente.invalidateQueries({ queryKey: ["admin", "lojas"] });
  cliente.invalidateQueries({ queryKey: ["painel-caixa"] });
};

export const useCriarLoja = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: criarLoja,
    onSuccess: () => invalidarLojas(cliente),
  });
};

export const useEditarLoja = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: editarLoja,
    onSuccess: () => invalidarLojas(cliente),
  });
};

export const useDefinirAtivoDaLoja = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: definirAtivoDaLoja,
    onSuccess: () => invalidarLojas(cliente),
  });
};

export const useApagarLoja = () => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: apagarLoja,
    onSuccess: () => invalidarLojas(cliente),
  });
};
