import type { QueryClient } from "@tanstack/react-query";

/**
 * O que fica velho quando a gerência muda a empresa.
 *
 * São três respostas diferentes, e esquecer qualquer uma delas dá o mesmo
 * sintoma: a tela continua mostrando o estado anterior, e só sair e voltar (ou
 * recarregar) conserta.
 *
 * - `usuario-atual` é o `/user/me`, de onde saem a aba Catálogo e o filtro
 *   Desperdício. Tem `staleTime` de 30 minutos, então sem invalidar ele
 *   ligar o catálogo não mudava nada na tela por meia hora.
 * - `painel-caixa` porque "fechamentos por dia" muda o que o painel cobra de
 *   cada loja.
 * - `admin` é a própria tela Empresa.
 *
 * O resto do cache fica: notas, catálogo de itens e fechamentos já lançados
 * não mudam porque um interruptor virou, e refazê-los a cada clique seria
 * trabalho à toa no meio do expediente.
 */
export const atualizarAposEditarEmpresa = (cliente: QueryClient) => {
  cliente.invalidateQueries({ queryKey: ["admin"] });
  cliente.invalidateQueries({ queryKey: ["painel-caixa"] });
  cliente.invalidateQueries({ queryKey: ["usuario-atual"] });
};
