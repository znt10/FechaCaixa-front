/**
 * As abas do arquivo da planilha, na ordem em que aparecem nele.
 *
 * Espelham ABAS de app/api/v1/views/planilha.py: a `chave` e o nome que o
 * backend entende em ?abas=. Uma aba nova la precisa entrar aqui para poder
 * ser escolhida.
 */
export const ABAS_DA_PLANILHA = [
  { chave: "entradas", rotulo: "Entradas" },
  { chave: "saidas", rotulo: "Saídas" },
  { chave: "consumo_por_pessoa", rotulo: "Consumo por pessoa" },
  { chave: "consumo", rotulo: "Consumo" },
  { chave: "desperdicio", rotulo: "Desperdício" },
] as const;

export type ChaveDaAba = (typeof ABAS_DA_PLANILHA)[number]["chave"];

/** O pedido do arquivo. As abas vao na ordem do arquivo, e nao na ordem em
 *  que foram marcadas — o backend tambem reordena, mas o endereco igual para a
 *  mesma escolha e o que deixa o pedido ser lido no log sem adivinhar. */
export const enderecoDaPlanilha = (
  de: string,
  ate: string,
  marcadas: ReadonlySet<ChaveDaAba>,
) => {
  const abas = ABAS_DA_PLANILHA.map((aba) => aba.chave).filter((chave) =>
    marcadas.has(chave),
  );
  return `/planilha/?de=${de}&ate=${ate}&abas=${abas.join(",")}`;
};
