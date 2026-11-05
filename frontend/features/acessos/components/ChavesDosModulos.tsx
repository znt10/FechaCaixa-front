import type { Modulos } from "../services/acessos";

const ROTULOS: { chave: keyof Modulos; rotulo: string }[] = [
  { chave: "notas", rotulo: "Notas fiscais" },
  { chave: "banco", rotulo: "Banco (extrato)" },
  { chave: "comprovantes", rotulo: "Comprovantes" },
];

/** Os três módulos que a empresa contrata, como chaves de sim ou não. */
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
    <div className="flex flex-wrap gap-x-[20px] gap-y-[8px]">
      {ROTULOS.map(({ chave, rotulo }) => (
        <label key={chave} className="flex items-center gap-[8px] text-[14px]">
          <input
            type="checkbox"
            checked={modulos[chave]}
            disabled={ocupado}
            onChange={(e) => onMudar({ [chave]: e.target.checked })}
            className="h-[16px] w-[16px] accent-caixa-accent"
          />
          {rotulo}
        </label>
      ))}
    </div>
  );
}
