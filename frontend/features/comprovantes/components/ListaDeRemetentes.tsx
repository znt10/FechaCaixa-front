"use client";

import { useState } from "react";

import { useApagarRemetente, useCriarRemetente, useRemetentes } from "../hooks/useComprovantes";

export function ListaDeRemetentes() {
  const remetentes = useRemetentes();
  const criar = useCriarRemetente();
  const apagar = useApagarRemetente();
  const [email, setEmail] = useState("");

  const adicionar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!email.trim()) return;
    await criar.mutateAsync(email.trim());
    setEmail("");
  };

  return (
    <section className="flex flex-col gap-[12px]">
      <div>
        <h2 className="text-[16px] font-bold">Quem pode mandar</h2>
        <p className="text-[13px] text-caixa-muted">
          Só os e-mails desta lista. Mandado de outro e-mail, o comprovante não entra.
        </p>
      </div>
      <form onSubmit={adicionar} className="flex flex-wrap gap-[8px]">
        <input
          type="email"
          placeholder="nome@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-[240px] flex-1 rounded-[10px] border border-caixa-border px-[12px] py-[9px] text-[14px]"
        />
        <button type="submit" disabled={criar.isPending} className="rounded-[10px] bg-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-white disabled:opacity-50">
          Adicionar
        </button>
      </form>
      {criar.error && <p className="text-[13px] text-red-700">{(criar.error as Error).message}</p>}
      <ul className="flex flex-col divide-y divide-caixa-border rounded-[12px] border border-caixa-border">
        {(remetentes.data ?? []).map((remetente) => (
          <li key={remetente.id} className="flex items-center justify-between px-[14px] py-[10px] text-[14px]">
            {remetente.email}
            <button type="button" onClick={() => apagar.mutate(remetente.id)} className="text-[13px] text-red-700">
              Remover
            </button>
          </li>
        ))}
        {remetentes.data?.length === 0 && (
          <li className="px-[14px] py-[10px] text-[14px] text-caixa-muted">Nenhum e-mail ainda.</li>
        )}
      </ul>
    </section>
  );
}
