"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useGruposDeDespesa } from "@/features/admin/hooks/useNotas";
import { apiV1 } from "@/shared/services/api";

export function CategoriasDosComprovantes() {
  const grupos = useGruposDeDespesa();
  const cliente = useQueryClient();
  const [grupo, setGrupo] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const adicionar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!grupo || !nome.trim()) return;
    setErro(null);
    try {
      await apiV1("/elementos-de-despesa/", {
        method: "POST",
        body: JSON.stringify({ nome: nome.trim(), grupo_id: grupo }),
      });
      setNome("");
      // A mesma lista alimenta o seletor das notas e o dos comprovantes.
      await cliente.invalidateQueries();
    } catch (falha) {
      setErro((falha as Error).message);
    }
  };

  return (
    <section className="flex flex-col gap-[12px]">
      <div>
        <h2 className="text-[16px] font-bold">Categorias</h2>
        <p className="text-[13px] text-caixa-muted">
          As mesmas das notas fiscais: o aluguel pago por comprovante cai na mesma linha.
        </p>
      </div>
      <ul className="grid gap-[12px] md:grid-cols-2">
        {(grupos.data ?? []).map((item) => (
          <li key={item.id} className="rounded-[12px] border border-caixa-border p-[12px]">
            <p className="text-[14px] font-semibold">{item.nome}</p>
            <p className="text-[13px] text-caixa-muted">
              {item.elementos.filter((elemento) => elemento.ativo).map((elemento) => elemento.nome).join(", ") || "—"}
            </p>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="flex flex-wrap gap-[8px]">
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="rounded-[10px] border border-caixa-border px-[12px] py-[9px] text-[14px]">
          <option value="">Grupo…</option>
          {(grupos.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>{item.nome}</option>
          ))}
        </select>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova categoria" className="min-w-[200px] flex-1 rounded-[10px] border border-caixa-border px-[12px] py-[9px] text-[14px]" />
        <button type="submit" className="rounded-[10px] bg-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-white">
          Adicionar
        </button>
      </form>
      {erro && <p className="text-[13px] text-red-700">{erro}</p>}
    </section>
  );
}
