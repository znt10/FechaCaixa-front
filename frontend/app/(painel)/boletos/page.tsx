"use client";

import { ListaDeBoletos } from "@/features/boletos/components/ListaDeBoletos";

/**
 * Boletos a pagar.
 *
 * O que chegou na loja (ou para a gerência) e ainda não foi pago, com a foto e
 * a linha digitável para pagar de longe. Pagos ficam na outra aba: a pasta em
 * que os dois se misturavam era o problema.
 */
export default function BoletosPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <div className="pt-[28px]">
        <ListaDeBoletos />
      </div>
    </main>
  );
}
