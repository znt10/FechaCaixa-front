"use client";

import { useMemo, useState } from "react";

import {
  escolhasIniciais,
  filtroDoResumo,
  trocarDeFiltro,
  type EscolhasDoExtrato,
} from "@/features/banco/banco-da-tela";
import { AvisoDeExtratoParado } from "@/features/banco/components/AvisoDeExtratoParado";
import { CabecalhoDoPeriodo } from "@/features/banco/components/CabecalhoDoPeriodo";
import { GastosPorGrupo } from "@/features/banco/components/GastosPorGrupo";
import { GraficoDoFluxo } from "@/features/banco/components/GraficoDoFluxo";
import { gastosPorGrupo, serieDoFluxo } from "@/features/banco/graficos-do-extrato";
import { useResumoDoExtrato } from "@/features/banco/hooks/useBanco";
import { ChipDeLoja } from "@/features/fechamento/components/ChipDeLoja";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";
import { hojeISO } from "@/features/fechamento/painel-dados";

/**
 * Gráficos do banco: o fluxo de caixa e para onde foi o dinheiro.
 *
 * Saíram do extrato, que é onde a gerência trabalha (subir o arquivo,
 * classificar) e já tem informação demais. Aqui é para olhar com calma, com o
 * mesmo período e a mesma loja do extrato, e os mesmos números do resumo dele.
 */
export default function GraficosDoBancoPage() {
  const [escolhas, setEscolhas] = useState<EscolhasDoExtrato>(() => escolhasIniciais(hojeISO()));
  const lojas = useLojasDoPainel();
  const recorte = useMemo(() => filtroDoResumo(escolhas), [escolhas]);
  const resumo = useResumoDoExtrato(recorte);

  const escolher = (mudanca: Partial<EscolhasDoExtrato>) =>
    setEscolhas((atual) => trocarDeFiltro(atual, mudanca));

  const porDia = resumo.data?.por_dia ?? [];
  const pontos = serieDoFluxo(porDia);
  const pagamentos = resumo.data?.por_tipo.find((bloco) => bloco.tipo === "PAGAMENTO") ?? { categorias: [] };

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <AvisoDeExtratoParado />
      <div className="flex flex-wrap items-center justify-between gap-[16px] py-[28px]">
        <CabecalhoDoPeriodo escolhas={escolhas} escolher={escolher} />
      </div>

      <div className="mb-[20px] flex flex-wrap gap-[8px]">
        <ChipDeLoja
          rotulo="Todas as lojas"
          ativo={escolhas.loja === ""}
          aoClicar={() => escolher({ loja: "", contaBancaria: "" })}
        />
        {(lojas.data ?? []).map((loja) => (
          <ChipDeLoja
            key={loja.id}
            rotulo={loja.nome_loja}
            ativo={escolhas.loja === loja.id}
            aoClicar={() => escolher({ loja: loja.id, contaBancaria: "" })}
          />
        ))}
      </div>

      {resumo.error && (
        <p className="text-[15px] text-caixa-alerta">Não foi possível carregar os números do banco.</p>
      )}

      {resumo.data && !resumo.error && (
        <div className="flex flex-col gap-[20px]">
          {pontos.length < 2 && (
            <p className="text-[14px] text-caixa-muted">
              {porDia.length === 0
                ? "Nenhuma movimentação no período."
                : "O fluxo de caixa aparece a partir de dois dias de movimento: escolha a semana ou o mês."}
            </p>
          )}
          <GraficoDoFluxo pontos={pontos} />
          <GastosPorGrupo gastos={gastosPorGrupo(pagamentos)} pendentes={resumo.data.pendentes.quantidade} />
        </div>
      )}
    </main>
  );
}
