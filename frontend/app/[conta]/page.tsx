"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { FormularioDeFechamento } from "@/features/fechamento/components/FormularioDeFechamento";
import { TelaDoCodigo } from "@/features/fechamento/components/TelaDoCodigo";
import { useEmpresaDoFormulario } from "@/features/fechamento/hooks/useAcesso";
import { useRegistrarPWA } from "@/features/fechamento/hooks/useRegistrarPWA";
import { enderecoDaEmpresa } from "@/features/fechamento/services/acesso";

/**
 * O endereco da empresa: /primavera, /aurorasalgados, /solar.
 *
 * E onde o aparelho fica depois de digitar o codigo — o codigo e a porta, e
 * este e o comodo. O apelido na URL nao da acesso a nada sozinho: quem responde
 * pelas lojas e pelos lancamentos e o cookie do aparelho, e este componente so
 * confere se os dois falam da mesma empresa.
 */
export default function EmpresaPage() {
  useRegistrarPWA();
  const { conta } = useParams<{ conta: string }>();
  const router = useRouter();
  const empresa = useEmpresaDoFormulario();

  const daMesmaEmpresa = empresa.data?.slug === conta;

  useEffect(() => {
    // Aparelho liberado para outra empresa: manda para a casa dele em vez de
    // mostrar o formulario do vizinho num endereco que nao e o dele.
    if (empresa.data && !daMesmaEmpresa) {
      router.replace(enderecoDaEmpresa(empresa.data));
    }
  }, [empresa.data, daMesmaEmpresa, router]);

  if (empresa.isPending) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-caixa-bg font-sans">
        <p className="text-[15px] text-caixa-muted">Abrindo o formulário...</p>
      </div>
    );
  }

  if (empresa.error || !empresa.data) {
    return (
      <TelaDoCodigo aoEntrar={(nova) => router.replace(enderecoDaEmpresa(nova))} />
    );
  }

  if (!daMesmaEmpresa) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-caixa-bg font-sans">
        <p className="text-[15px] text-caixa-muted">Abrindo o formulário...</p>
      </div>
    );
  }

  return <FormularioDeFechamento empresa={empresa.data} />;
}
