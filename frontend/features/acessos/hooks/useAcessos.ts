import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adicionarGerente,
  criarEmpresa,
  getAcessos,
  mudarModulos,
  reenviarLink,
} from "../services/acessos";

const RAIZ = ["acessos"];

export const useAcessos = () => useQuery({ queryKey: RAIZ, queryFn: getAcessos });

/** Toda mudança aqui muda a lista (módulo, gerente novo, situação): relê. */
const useMudanca = <Entrada, Saida>(acao: (entrada: Entrada) => Promise<Saida>) => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: acao,
    onSuccess: () => cliente.invalidateQueries({ queryKey: RAIZ }),
  });
};

export const useCriarEmpresa = () => useMudanca(criarEmpresa);
export const useMudarModulos = () => useMudanca(mudarModulos);
export const useAdicionarGerente = () => useMudanca(adicionarGerente);
export const useReenviarLink = () => useMudanca(reenviarLink);
