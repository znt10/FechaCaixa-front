"use client";

import { useState, type FormEvent } from "react";

import { corpoDoGerente, DICA_DA_SENHA } from "../acessos-da-tela";
import type { NovoGerente } from "../services/acessos";
import { BOTAO_FORTE, CAMPO } from "./estilos";

/** Nome, e-mail e senha opcional, com o botão de enviar (Adicionar gerente).
 *  A Nova empresa usa só os `CamposDoGerente`, dentro do formulário dela. */
export function FormularioDeGerente({
  rotulo,
  ocupado,
  onEnviar,
}: {
  rotulo: string;
  ocupado: boolean;
  onEnviar: (gerente: NovoGerente) => Promise<void>;
}) {
  const [campos, setCampos] = useState({ nome: "", email: "", senha: "" });
  const mudar = (campo: keyof typeof campos) => (valor: string) =>
    setCampos((atual) => ({ ...atual, [campo]: valor }));

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    await onEnviar(corpoDoGerente(campos));
    setCampos({ nome: "", email: "", senha: "" });
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-[10px]">
      <CamposDoGerente campos={campos} mudar={mudar} />
      <div>
        <button type="submit" disabled={ocupado} className={BOTAO_FORTE}>
          {ocupado ? "Salvando..." : rotulo}
        </button>
      </div>
    </form>
  );
}

export function CamposDoGerente({
  campos,
  mudar,
}: {
  campos: { nome: string; email: string; senha: string };
  mudar: (campo: "nome" | "email" | "senha") => (valor: string) => void;
}) {
  return (
    <div className="grid gap-[10px] md:grid-cols-3">
      <label className="flex flex-col gap-[4px] text-[13px] text-caixa-muted">
        Nome do gerente
        <input
          name="nome"
          required
          value={campos.nome}
          onChange={(e) => mudar("nome")(e.target.value)}
          className={CAMPO}
        />
      </label>
      <label className="flex flex-col gap-[4px] text-[13px] text-caixa-muted">
        E-mail
        <input
          name="email"
          type="email"
          required
          value={campos.email}
          onChange={(e) => mudar("email")(e.target.value)}
          className={CAMPO}
        />
      </label>
      <label className="flex flex-col gap-[4px] text-[13px] text-caixa-muted">
        Senha (opcional)
        <input
          name="senha"
          type="password"
          autoComplete="new-password"
          value={campos.senha}
          onChange={(e) => mudar("senha")(e.target.value)}
          className={CAMPO}
        />
      </label>
      <p className="text-[12px] leading-[1.4] text-caixa-muted md:col-span-3">{DICA_DA_SENHA}</p>
    </div>
  );
}
