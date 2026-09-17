import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/shared/services/auth";

/**
 * Quem esta logado e o que a empresa dele contratou.
 *
 * Uma chave so para o painel inteiro, e nao uma consulta por tela: a barra
 * superior pergunta o nome, o menu pergunta o modulo, e sao a mesma resposta.
 * Em chaves separadas cada tela pediria de novo o que a outra ja tinha.
 *
 * O `staleTime` longo porque nada disto muda no meio do expediente: cargo e
 * modulo contratado mudam num cadastro, nao enquanto se classifica nota. Numa
 * chave compartilhada as opcoes tem que morar num lugar so — dois hooks com
 * `staleTime` diferente na mesma chave fazem a ordem de montagem decidir qual
 * vale, e ai o cache passa a depender de qual tela abriu primeiro.
 */
export const useUsuarioAtual = () =>
  useQuery({
    queryKey: ["usuario-atual"],
    queryFn: getMe,
    staleTime: 30 * 60 * 1000,
  });
