/** Um chip por loja: oito cabem numa linha e custam um clique, onde um
 *  seletor esconderia a lista atrás de outro toque. Gráficos e Comprovantes. */
export function ChipDeLoja({
  rotulo,
  ativo,
  aoClicar,
}: {
  rotulo: string;
  ativo: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoClicar}
      className={`rounded-[8px] border px-[14px] py-[8px] text-[14px] font-medium transition ${
        ativo
          ? "border-caixa-accent bg-caixa-accent-soft text-caixa-accent"
          : "border-caixa-border bg-caixa-surface text-caixa-muted hover:text-caixa-ink"
      }`}
    >
      {rotulo}
    </button>
  );
}
