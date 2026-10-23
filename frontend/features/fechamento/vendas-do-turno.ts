import type {
  DesperdicioLancado,
  VendaDoTurno,
} from "@/features/fechamento/services/fechamentos";

/**
 * As vendas do turno, do jeito que o formulario guarda — quantidade digitada
 * por id do item — para o jeito que o servidor recebe.
 *
 * Campo vazio ou zero fica de fora: e o item que nao vendeu no turno. Sem
 * mensagem de erro aqui, porque o campo so aceita digito.
 */
export const montarVendasDoTurno = (
  quantidades: Record<string, string>,
): VendaDoTurno[] =>
  Object.entries(quantidades)
    .map(([salgado, texto]) => ({ salgado, quantidade: Number(texto) }))
    .filter((venda) => Number.isInteger(venda.quantidade) && venda.quantidade > 0);

/**
 * O caminho de volta, na correcao: as linhas que o servidor devolveu viram os
 * campos preenchidos. Duas linhas do mesmo item somam no mesmo campo.
 */
export const quantidadesDasVendas = (
  vendas: Pick<DesperdicioLancado, "salgado" | "quantidade">[],
): Record<string, string> => {
  const quantidades: Record<string, string> = {};
  for (const venda of vendas) {
    quantidades[venda.salgado] = String(
      Number(quantidades[venda.salgado] ?? 0) + venda.quantidade,
    );
  }
  return quantidades;
};
