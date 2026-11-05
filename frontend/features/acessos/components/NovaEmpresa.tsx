"use client";

import { useState, type FormEvent } from "react";

import { avisoDoGerente, corpoDoGerente } from "../acessos-da-tela";
import { useCriarEmpresa } from "../hooks/useAcessos";
import type { Modulos } from "../services/acessos";
import { ChavesDosModulos } from "./ChavesDosModulos";
import { BOTAO, BOTAO_FORTE, CAMPO } from "./estilos";
import { CamposDoGerente } from "./FormularioDeGerente";

const VAZIO = { nome: "", email: "", senha: "" };
const SEM_MODULOS: Modulos = {
  notas: false,
  banco: false,
  comprovantes: false,
  comprovantes_pessoais: false,
};

/** A empresa nasce com o primeiro gerente: os dois num envio só. */
export function NovaEmpresa({ onAviso }: { onAviso: (aviso: string) => void }) {
  const criar = useCriarEmpresa();
  const [aberta, setAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [modulos, setModulos] = useState<Modulos>(SEM_MODULOS);
  const [gerente, setGerente] = useState(VAZIO);
  const mudar = (campo: keyof typeof VAZIO) => (valor: string) =>
    setGerente((atual) => ({ ...atual, [campo]: valor }));

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const corpo = corpoDoGerente(gerente);
    const empresa = await criar.mutateAsync({ nome: nome.trim(), modulos, gerente: corpo });
    onAviso(`${empresa.nome} criada. ${avisoDoGerente(corpo.email, empresa.email_enviado)}`);
    setNome("");
    setModulos(SEM_MODULOS);
    setGerente(VAZIO);
    setAberta(false);
  };

  if (!aberta) {
    return (
      <button type="button" onClick={() => setAberta(true)} className={BOTAO_FORTE}>
        Nova empresa
      </button>
    );
  }

  return (
    <form
      onSubmit={(evento) => enviar(evento).catch(() => {})}
      className="cartao-caixa flex flex-col gap-[16px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px]"
    >
      <h2 className="text-[17px] font-bold">Nova empresa</h2>
      <label className="flex flex-col gap-[4px] text-[13px] text-caixa-muted">
        Nome da empresa
        <input
          name="empresa"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={CAMPO}
        />
      </label>
      <ChavesDosModulos
        modulos={modulos}
        ocupado={criar.isPending}
        onMudar={(mudanca) => setModulos((atual) => ({ ...atual, ...mudanca }))}
      />
      <div className="flex flex-col gap-[8px] border-t border-caixa-border pt-[14px]">
        <span className="text-[14px] font-semibold">Primeiro gerente</span>
        <CamposDoGerente campos={gerente} mudar={mudar} />
      </div>
      {criar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {criar.error instanceof Error ? criar.error.message : "Não foi possível criar a empresa."}
        </p>
      )}
      <div className="flex flex-wrap gap-[8px]">
        <button type="submit" disabled={criar.isPending} className={BOTAO_FORTE}>
          {criar.isPending ? "Criando..." : "Criar empresa"}
        </button>
        <button type="button" onClick={() => setAberta(false)} className={BOTAO}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
