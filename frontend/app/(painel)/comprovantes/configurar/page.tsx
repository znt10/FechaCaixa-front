"use client";

import { useState } from "react";

import { enderecosParaMandar } from "@/features/comprovantes/comprovantes-da-tela";
import { CartaoDeConfiguracao } from "@/features/comprovantes/components/CartaoDeConfiguracao";
import { CategoriasDosComprovantes } from "@/features/comprovantes/components/CategoriasDosComprovantes";
import { ListaDeRemetentes } from "@/features/comprovantes/components/ListaDeRemetentes";
import {
  useAreaDeComprovantes,
  useConfiguracao,
} from "@/features/comprovantes/hooks/useComprovantes";

export default function ConfigurarComprovantesPage() {
  const configuracao = useConfiguracao();
  const area = useAreaDeComprovantes();
  // Qual endereço acabou de ser copiado: são dois botões na mesma tela.
  const [copiado, setCopiado] = useState<string | null>(null);
  const destinos = configuracao.data ? enderecosParaMandar(configuracao.data, area.pessoais) : [];

  const copiar = async (endereco: string) => {
    await navigator.clipboard.writeText(endereco);
    setCopiado(endereco);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-[20px] px-[16px] pb-[60px] pt-[28px] md:px-[40px]">
      <div className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Configurar</h1>
        <p className="text-[14px] text-caixa-muted">Para onde mandar, quem pode mandar e as categorias.</p>
      </div>

      <CartaoDeConfiguracao
        titulo="Mande os comprovantes para"
        descricao={
          area.pessoais
            ? "Encaminhe o comprovante do app do banco, mandando de um dos e-mails cadastrados abaixo. O endereço decide de quem é o gasto, não a conta que pagou: o pessoal nunca soma nas lojas."
            : "Encaminhe para este e-mail o comprovante do app do banco, mandando de um dos e-mails cadastrados abaixo."
        }
      >
        {destinos.map(({ rotulo, endereco }) => (
          <div key={rotulo} className="flex flex-col gap-[6px]">
            {/* Com um destino só, o rótulo sobra: o título já diz tudo. */}
            {destinos.length > 1 && (
              <span className="text-[13px] font-semibold text-caixa-muted">{rotulo}</span>
            )}
            {endereco ? (
              <div className="flex flex-wrap items-center gap-[8px]">
                <code className="break-all rounded-[8px] bg-zinc-100 px-[10px] py-[6px] text-[15px]">
                  {endereco}
                </code>
                <button
                  type="button"
                  onClick={() => copiar(endereco)}
                  className="text-[14px] font-semibold text-caixa-accent"
                >
                  {copiado === endereco ? "Copiado" : "Copiar"}
                </button>
              </div>
            ) : (
              <p className="text-[14px] text-caixa-muted">A caixa de e-mail ainda não foi configurada.</p>
            )}
          </div>
        ))}
        {configuracao.data && !configuracao.data.leitura_ligada && (
          <p className="text-[13px] text-amber-900">
            A leitura automática está desligada: os comprovantes entram para conferir.
          </p>
        )}
      </CartaoDeConfiguracao>

      <ListaDeRemetentes />
      <CategoriasDosComprovantes />
    </main>
  );
}
