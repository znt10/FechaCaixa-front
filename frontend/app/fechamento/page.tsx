"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EscolhaDaPorta } from "@/features/fechamento/components/EscolhaDaPorta";
import { TelaDoCodigo } from "@/features/fechamento/components/TelaDoCodigo";
import { useEmpresaDoFormulario } from "@/features/fechamento/hooks/useAcesso";
import { useRegistrarPWA } from "@/features/fechamento/hooks/useRegistrarPWA";
import { enderecoDaEmpresa } from "@/features/fechamento/services/acesso";

/**
 * A porta do formulario, sem endereco de empresa nenhum.
 *
 * E onde o app abre quando ainda nao se sabe de quem e o aparelho: escolhe-se
 * entre o formulario e o painel, digita-se o codigo e o proprio backend diz
 * para onde ir (/primavera). Aparelho que ja entrou nao para aqui.
 *
 * A escolha aparece so aqui, e nao em /<empresa>: este e o `start_url` do
 * manifest, ou seja, a porta de quem acabou de instalar o app. Quem abre
 * /primavera veio com o formulario em mente.
 */
export default function FechamentoPage() {
  useRegistrarPWA();
  const router = useRouter();
  const empresa = useEmpresaDoFormulario();
  const slug = empresa.data?.slug;

  // Nao persiste de proposito: quem escolhe o formulario digita o codigo e
  // vira aparelho da loja, e a partir dai o cookie decide sozinho.
  const [porta, setPorta] = useState<"escolha" | "codigo">("escolha");

  useEffect(() => {
    if (slug) router.replace(`/${slug}`);
  }, [slug, router]);

  if (empresa.isPending || slug) {
    // "Abrindo..." sem dizer o que: enquanto a resposta nao chega, esta tela
    // ainda pode virar o formulario (aparelho ja liberado) ou a escolha das
    // duas portas. Prometer o formulario aqui desmentiria metade dos casos.
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-caixa-bg font-sans">
        <p className="text-[15px] text-caixa-muted">Abrindo...</p>
      </div>
    );
  }

  if (porta === "escolha") {
    return <EscolhaDaPorta aoEscolherFormulario={() => setPorta("codigo")} />;
  }

  return (
    <TelaDoCodigo aoEntrar={(nova) => router.replace(enderecoDaEmpresa(nova))} />
  );
}
