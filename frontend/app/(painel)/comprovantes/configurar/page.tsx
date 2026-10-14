"use client";

import { useState } from "react";

import { CartaoDeConfiguracao } from "@/features/comprovantes/components/CartaoDeConfiguracao";
import { CategoriasDosComprovantes } from "@/features/comprovantes/components/CategoriasDosComprovantes";
import { ListaDeRemetentes } from "@/features/comprovantes/components/ListaDeRemetentes";
import { useConfiguracao } from "@/features/comprovantes/hooks/useComprovantes";

export default function ConfigurarComprovantesPage() {
  const configuracao = useConfiguracao();
  const [copiado, setCopiado] = useState(false);
  const endereco = configuracao.data?.endereco ?? "";

  const copiar = async () => {
    await navigator.clipboard.writeText(endereco);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-[20px] px-[16px] pb-[60px] pt-[28px] md:px-[40px]">
      <div className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Configurar</h1>
        <p className="text-[14px] text-caixa-muted">Para onde mandar, quem pode mandar e as categorias.</p>
      </div>

      <CartaoDeConfiguracao
        titulo="Mande os comprovantes para"
        descricao="Encaminhe para este e-mail o comprovante do app do banco, mandando de um dos e-mails cadastrados abaixo."
      >
        {endereco ? (
          <div className="flex flex-wrap items-center gap-[8px]">
            <code className="rounded-[8px] bg-zinc-100 px-[10px] py-[6px] text-[15px]">{endereco}</code>
            <button type="button" onClick={copiar} className="text-[14px] font-semibold text-caixa-accent">
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        ) : (
          <p className="text-[14px] text-caixa-muted">A caixa de e-mail ainda não foi configurada.</p>
        )}
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
