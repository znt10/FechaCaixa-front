"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * O link antigo, /fechamento/<empresa>.
 *
 * Esta escrito em bilhete colado no balcao e salvo na tela inicial de celular
 * de loja; virar 404 seria tirar o formulario do ar de quem ja usa. Manda para
 * o endereco novo da mesma empresa, que e um segmento mais curto.
 */
export default function LinkAntigoDoFormulario() {
  const { conta } = useParams<{ conta: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${conta}`);
  }, [conta, router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-caixa-bg font-sans">
      <p className="text-[15px] text-caixa-muted">Abrindo o formulário...</p>
    </div>
  );
}
