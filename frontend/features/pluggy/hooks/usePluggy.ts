import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  buscarAgora,
  criarConexao,
  getPainelDaPluggy,
  mudarConexao,
  testarConexao,
  vincularContas,
  type MudancaDaConexao,
  type NovaConexao,
  type Vinculo,
} from "../services/pluggy";

const CHAVE = ["pluggy"];
// A chave raiz de useBanco (RAIZ = "banco"): as contas bancárias (origem e
// "atualizado há") vivem em ["banco", "contas"].
const CHAVE_DO_BANCO = ["banco"];

/**
 * O painel da Pluggy, sempre relido (mesma política do painel da Plataforma:
 * a cópia nunca vale como fresca, relê ao voltar para a aba e a cada 10 min).
 * `retry: false` porque quem não é superusuário toma 403 e não adianta tentar.
 */
export const usePainelDaPluggy = ({ habilitado }: { habilitado: boolean }) =>
  useQuery({
    queryKey: CHAVE,
    queryFn: getPainelDaPluggy,
    enabled: habilitado,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10 * 60 * 1000,
    retry: false,
  });

/** Toda ação muda a conexão e as contas bancárias: relê as duas listas. */
const useAcaoDaPluggy = <T, R>(acao: (entrada: T) => Promise<R>) => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: acao,
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: CHAVE }),
        cliente.invalidateQueries({ queryKey: CHAVE_DO_BANCO }),
      ]),
  });
};

export const useCriarConexao = () => useAcaoDaPluggy((dados: NovaConexao) => criarConexao(dados));

export const useMudarConexao = () =>
  useAcaoDaPluggy(({ id, mudanca }: { id: string; mudanca: MudancaDaConexao }) =>
    mudarConexao(id, mudanca),
  );

export const useTestarConexao = () => useAcaoDaPluggy(testarConexao);

export const useVincularContas = () =>
  useAcaoDaPluggy(({ id, vinculos }: { id: string; vinculos: Vinculo[] }) =>
    vincularContas(id, vinculos),
  );

export const useBuscarAgora = () => useAcaoDaPluggy(buscarAgora);
