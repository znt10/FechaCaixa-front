import type { Modulos } from "../services/acessos";

const ROTULOS: { chave: Exclude<keyof Modulos, "comprovantes_pessoais">; rotulo: string }[] = [
  { chave: "notas", rotulo: "Notas fiscais" },
  { chave: "banco", rotulo: "Banco (extrato)" },
  { chave: "comprovantes", rotulo: "Comprovantes" },
];

const CHAVE = "h-[16px] w-[16px] accent-caixa-accent";

/** Os módulos como chaves de sim ou não. A tela CPF fica embaixo de
 *  Comprovantes e só liga com ele: sem a área de comprovantes ela não tem
 *  onde aparecer. */
export function ChavesDosModulos({
  modulos,
  ocupado,
  onMudar,
}: {
  modulos: Modulos;
  ocupado: boolean;
  onMudar: (mudanca: Partial<Modulos>) => void;
}) {
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex flex-wrap gap-x-[20px] gap-y-[8px]">
        {ROTULOS.map(({ chave, rotulo }) => (
          <label key={chave} className="flex items-center gap-[8px] text-[14px]">
            <input
              type="checkbox"
              name={chave}
              checked={modulos[chave]}
              disabled={ocupado}
              onChange={(e) => onMudar({ [chave]: e.target.checked })}
              className={CHAVE}
            />
            {rotulo}
          </label>
        ))}
      </div>
      <label
        className={`flex items-center gap-[8px] pl-[24px] text-[14px] ${
          modulos.comprovantes ? "" : "text-caixa-muted"
        }`}
      >
        <input
          type="checkbox"
          name="comprovantes_pessoais"
          checked={modulos.comprovantes && modulos.comprovantes_pessoais}
          disabled={ocupado || !modulos.comprovantes}
          onChange={(e) => onMudar({ comprovantes_pessoais: e.target.checked })}
          className={CHAVE}
        />
        Comprovantes pessoais (CPF)
      </label>
    </div>
  );
}
