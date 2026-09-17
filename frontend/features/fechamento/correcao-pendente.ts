import type { FechamentoConfirmacao } from "./services/fechamentos";

/**
 * O ultimo lancamento que esta loja mandou, enquanto ainda da para corrigir.
 *
 * Fica no localStorage porque o cenario real e o celular: a funcionaria manda,
 * bloqueia a tela, percebe o erro e volta — e o navegador ja descartou a
 * pagina. Sem isto ela perderia a janela sem ter feito nada errado.
 *
 * E por conta (o mesmo aparelho pode abrir o link de mais de um cliente) e
 * guarda o horario-limite em milissegundos do proprio aparelho: o backend
 * mandou "faltam N segundos", e a conta daqui e sempre de tempo decorrido,
 * nunca de hora do relogio, que no celular da loja costuma estar errada.
 *
 * O modulo e um store externo lido com useSyncExternalStore, e nao um
 * useState preenchido num efeito: quem manda no valor e o localStorage, e
 * espelhar isso no estado do React exigiria justamente o setState dentro de
 * efeito que causa render em cascata.
 */
export type CorrecaoPendente = {
  confirmacao: FechamentoConfirmacao;
  expiraEm: number;
};

const chave = (conta: string) => `fechacaixa:correcao:${conta}`;

// Copia em memoria do que esta aba escreveu. Ganha do localStorage porque e
// sempre pelo menos tao nova quanto ele — e porque no modo anonimo do iOS o
// localStorage simplesmente lanca excecao, e sem este espelho a tela de
// confirmacao nunca apareceria.
const memoria = new Map<string, CorrecaoPendente | null>();

const ouvintes = new Set<() => void>();
let versao = 0;

const avisar = () => {
  versao += 1;
  for (const ouvinte of ouvintes) ouvinte();
};

export const assinarCorrecaoPendente = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  // Duas abas do mesmo link mexem no mesmo lembrete.
  if (ouvintes.size === 1) window.addEventListener("storage", avisar);

  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) window.removeEventListener("storage", avisar);
  };
};

const carregar = (conta: string): CorrecaoPendente | null => {
  if (memoria.has(conta)) return memoria.get(conta) ?? null;

  try {
    const bruto = window.localStorage.getItem(chave(conta));
    if (!bruto) return null;

    const salvo = JSON.parse(bruto) as CorrecaoPendente;
    // Prazo vencido antes mesmo de abrir a tela: nao ha o que oferecer.
    if (!salvo?.confirmacao?.id || salvo.expiraEm <= Date.now()) return null;
    return salvo;
  } catch {
    return null;
  }
};

// useSyncExternalStore exige que duas leituras seguidas devolvam a MESMA
// referencia enquanto nada mudou — sem este cache, cada JSON.parse criaria um
// objeto novo e o React renderizaria em loop.
let cache: { conta: string; versao: number; valor: CorrecaoPendente | null } | null =
  null;

export const lerCorrecaoPendente = (conta: string): CorrecaoPendente | null => {
  if (cache && cache.conta === conta && cache.versao === versao) return cache.valor;

  const valor = carregar(conta);
  cache = { conta, versao, valor };
  return valor;
};

/** No servidor nao existe lembrete nenhum — e o que o HTML inicial mostra. */
export const semCorrecaoPendente = () => null;

export const salvarCorrecaoPendente = (
  conta: string,
  pendente: CorrecaoPendente,
) => {
  memoria.set(conta, pendente);
  try {
    window.localStorage.setItem(chave(conta), JSON.stringify(pendente));
  } catch {
    // Sem o lembrete gravado a correcao ainda funciona nesta aba (a memoria
    // acima basta); nao vale derrubar o envio por causa disso.
  }
  avisar();
};

export const esquecerCorrecaoPendente = (conta: string) => {
  memoria.set(conta, null);
  try {
    window.localStorage.removeItem(chave(conta));
  } catch {
    /* idem */
  }
  avisar();
};

/** "19:07" — minutos e segundos, que e como se le um prazo curto. */
export const emMinutosESegundos = (segundos: number) => {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, "0")}`;
};
