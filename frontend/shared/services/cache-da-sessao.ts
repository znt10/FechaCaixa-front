import type { QueryClient } from "@tanstack/react-query";

/**
 * Onde o React Query guarda a cópia das consultas na aba (sessionStorage).
 *
 * Nome explícito, e não o padrão da biblioteca, porque quem apaga a cópia
 * (`esquecerSessaoAnterior`) e quem a grava (o persister em providers.tsx)
 * precisam concordar sobre ele — e um padrão implícito é exatamente o que um
 * dia muda numa atualização sem ninguém perceber.
 */
export const CHAVE_DO_CACHE = "REACT_QUERY_OFFLINE_CACHE";

/**
 * Apaga tudo o que a sessão anterior deixou carregado: a memória e a cópia
 * salva na aba.
 *
 * As consultas não levam a conta na chave (`["usuario-atual"]`,
 * `["painel-caixa","lojas"]`), então o cache só pertence a quem está logado
 * enquanto ninguém troca de login. Esquecê-lo na troca é o que impede a
 * empresa seguinte de ver o nome, as lojas e as notas da anterior.
 *
 * `clear()` sozinho não bastava: o persister grava a cópia da aba com atraso
 * de 1s, quem sai navega antes disso, e a tela de login restaurava o cache
 * antigo inteiro — fresco, com `staleTime` de 5 minutos. Por isso a cópia sai
 * aqui, na hora.
 */
export const esquecerSessaoAnterior = (
  cliente: QueryClient,
  armazenamento?: Pick<Storage, "removeItem">,
) => {
  cliente.clear();

  try {
    // Dentro do try, e não como valor padrão do parâmetro: com os dados do
    // site bloqueados, até LER `window.sessionStorage` lança.
    const onde =
      armazenamento ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    onde?.removeItem(CHAVE_DO_CACHE);
  } catch {
    // Aba anônima ou dados bloqueados: o sessionStorage lança. Não há cópia
    // para apagar onde nada pôde ser gravado, e a memória já saiu limpa.
  }
};
