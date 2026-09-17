/**
 * Como as duas listas do formulario (lojas, quem retira) se mantem em dia.
 *
 * O aparelho da loja fica o dia inteiro na mesma aba, aberta e em foco. O
 * React Query so vai a rede ao montar, ao ganhar foco e ao reconectar — e num
 * celular parado no balcao nenhum dos tres acontece. staleTime nao busca nada
 * sozinho: ele so marca o dado como velho, esperando um gatilho que ali nunca
 * vem. Resultado: a gerente cadastrava uma loja, ligava para a loja, e a loja
 * nao estava no seletor.
 *
 * Por isso as duas listas se buscam no relogio. Nao ha como avisar o aparelho
 * de fora — quem cadastra esta em outro dispositivo, e invalidar cache so
 * alcanca o navegador de quem fez a mutacao.
 *
 * Os numeros: cinco minutos de validade (abrir o formulario varias vezes
 * seguidas nao vai a rede toda vez, que no celular da loja e o que mais
 * demora) e uma busca a cada cinco minutos enquanto a aba estiver visivel.
 * Com a aba escondida nao busca nada, que e o default e o certo para bateria:
 * ao voltar a ficar visivel, o foco ja dispara uma busca.
 */
const CINCO_MINUTOS = 5 * 60 * 1000;

export const OPCOES_DAS_LISTAS_DO_FORMULARIO = {
  staleTime: CINCO_MINUTOS,
  refetchInterval: CINCO_MINUTOS,
  refetchOnWindowFocus: true,
} as const;
