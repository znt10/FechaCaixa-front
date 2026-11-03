"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { estadoDoPortao, portaoMudou, type EstadoDoPortao } from "../mensalidade-da-tela";
import { useMinhaMensalidade } from "../hooks/useMensalidade";
import { EmpresaDesativada } from "./EmpresaDesativada";
import { FaixaDaMensalidade } from "./FaixaDaMensalidade";
import { TelaDePagamento } from "./TelaDePagamento";

/**
 * Entre a barra do topo e o conteúdo do painel.
 *
 * A barra fica fora de propósito: a pessoa bloqueada precisa poder sair e
 * trocar de login.
 */
export function PortaoDaMensalidade({ children }: { children: React.ReactNode }) {
  const mensalidade = useMinhaMensalidade();
  const estado = estadoDoPortao(mensalidade.data);
  const cliente = useQueryClient();
  const anterior = useRef<EstadoDoPortao | undefined>(undefined);

  // A mensalidade se relê sozinha (useMinhaMensalidade); quando ela destrava
  // ou tranca o painel, o resto das telas busca de novo sem a pessoa sair e
  // voltar. Só conta resposta de verdade: carregando, `data` é undefined.
  useEffect(() => {
    if (!mensalidade.data) return;
    if (portaoMudou(anterior.current, estado)) {
      cliente.invalidateQueries({ predicate: (consulta) => consulta.queryKey[0] !== "mensalidade" });
    }
    anterior.current = estado;
  }, [cliente, estado, mensalidade.data]);

  if (estado === "DESATIVADA") return <EmpresaDesativada />;
  if (estado === "BLOQUEADA" && mensalidade.data) {
    return <TelaDePagamento mensalidade={mensalidade.data} />;
  }

  return (
    <>
      <FaixaDaMensalidade mensalidade={mensalidade.data} />
      {children}
    </>
  );
}
