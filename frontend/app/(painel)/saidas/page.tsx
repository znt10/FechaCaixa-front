"use client";

import { useMemo, useState } from "react";

import {
  emReais,
  fimDaSemana,
  fimDoMes,
  hojeISO,
  inicioDaSemana,
  inicioDoMes,
  mesDe,
  rotuloDaSemana,
  rotuloDoDia,
  rotuloDoMes,
  rotuloDoPeriodo,
  somarDias,
  somarMeses,
} from "@/features/fechamento/painel-dados";
import {
  montarConsumoPorPessoa,
  montarDesperdicioPorSalgado,
  montarSaidas,
  type FiltroDeSaida,
  type LinhaDeConsumo,
  type LinhaDeDesperdicio,
  type LinhaDeSaidas,
  type OrdemDaLista,
  type TipoDeSaida,
} from "@/features/fechamento/saidas-dados";
import {
  useFechamentosDoIntervalo,
  useLojasDoPainel,
} from "@/features/fechamento/hooks/usePainel";
import { BarraDoPeriodo } from "@/features/fechamento/components/BarraDoPeriodo";

type Granularidade = "DIA" | "SEMANA" | "MES";

const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: "DIA", rotulo: "Dia" },
  { valor: "SEMANA", rotulo: "Semana" },
  { valor: "MES", rotulo: "Mês" },
];

/** "22/08" — o ano ja esta no rotulo do periodo, em cima. */
const diaCurto = (dataISO: string) => dataISO.slice(8, 10) + "/" + dataISO.slice(5, 7);

/**
 * Saidas por loja.
 *
 * O painel junta tudo num numero so ("registrado") porque ali a pergunta e
 * quanto a loja movimentou. Aqui a pergunta e outra: PARA ONDE o dinheiro foi.
 * Sao eventos diferentes — despesa e dinheiro gasto, retirada e dinheiro
 * levado pelo dono, devolucao e venda desfeita — e a descricao que a loja
 * escreve no formulario so era legivel abrindo um turno especifico.
 *
 * Nenhum valor aqui aparece com sinal de menos, e isso e proposital: retirada
 * e despesa VOLTAM para o total do caixa (sairam da gaveta depois da venda), e
 * a devolucao ja se descontou sozinha. Esta tela conta o destino do dinheiro,
 * nao um desconto.
 */
export default function SaidasPage() {
  const [granularidade, setGranularidade] = useState<Granularidade>("SEMANA");
  const [dia, setDia] = useState(hojeISO);
  const [mes, setMes] = useState(() => mesDe(hojeISO()));
  const [filtro, setFiltro] = useState<FiltroDeSaida>("TODAS");
  // Comeca no valor: a primeira pergunta da tela e quanto. Por nome e a outra
  // leitura, a de conferir uma pessoa ou uma loja — com 60 nomes na lista, o
  // tamanho da barra nao ajuda a achar ninguem.
  const [ordem, setOrdem] = useState<OrdemDaLista>("VALOR");
  const [abertas, setAbertas] = useState<string[]>([]);

  const { de, ate } =
    granularidade === "DIA"
      ? { de: dia, ate: dia }
      : granularidade === "SEMANA"
        ? { de: inicioDaSemana(dia), ate: fimDaSemana(dia) }
        : { de: inicioDoMes(mes), ate: fimDoMes(mes) };

  const lojas = useLojasDoPainel();
  const fechamentos = useFechamentosDoIntervalo(de, ate);

  const resumo = useMemo(
    () => montarSaidas(lojas.data ?? [], fechamentos.data ?? [], filtro, ordem),
    [lojas.data, fechamentos.data, filtro, ordem],
  );

  // Em "Consumo" a lista deixa de ser por loja e passa a ser por pessoa. A
  // pessoa nao e fixa numa loja — hoje esta na Lapa, amanha no Limao — entao
  // agrupar por loja espalha o consumo dela em varias linhas, e o total do mes,
  // que e o que a dona desconta do salario, nao aparece em lugar nenhum.
  const porPessoa = filtro === "CONSUMO";
  const pessoas = useMemo(
    () => montarConsumoPorPessoa(fechamentos.data ?? [], ordem),
    [fechamentos.data, ordem],
  );

  // "Desperdicio" tambem troca a lista, agora de loja para salgado: por loja
  // ela so dizia "Limão · 13 un", e a pergunta e qual item vai para o lixo.
  const porSalgado = filtro === "DESPERDICIO";
  const salgados = useMemo(
    () => montarDesperdicioPorSalgado(fechamentos.data ?? [], ordem),
    [fechamentos.data, ordem],
  );

  const itensDaLista = porPessoa ? pessoas : porSalgado ? salgados : resumo.linhas;

  const hoje = hojeISO();
  const ehPeriodoAtual =
    granularidade === "DIA"
      ? dia === hoje
      : granularidade === "SEMANA"
        ? inicioDaSemana(dia) === inicioDaSemana(hoje)
        : mes === mesDe(hoje);

  const passo = (direcao: 1 | -1) => {
    if (granularidade === "MES") setMes(somarMeses(mes, direcao));
    else setDia(somarDias(dia, direcao * (granularidade === "SEMANA" ? 7 : 1)));
  };

  const rotuloDoIntervalo =
    granularidade === "DIA"
      ? rotuloDoDia(dia)
      : granularidade === "SEMANA"
        ? rotuloDaSemana(dia)
        : rotuloDoMes(mes);

  // Escolher pelo calendario acerta os dois estados de uma vez: quem pulou
  // para marco vendo o dia e trocou para "Mês" esperava marco, e nao o mes que
  // tinha ficado para tras.
  const escolherPeriodo = (escolhido: string) => {
    if (granularidade === "MES") return setMes(escolhido);
    setDia(escolhido);
    setMes(mesDe(escolhido));
  };

  const alternar = (lojaId: string) =>
    setAbertas((atuais) =>
      atuais.includes(lojaId)
        ? atuais.filter((id) => id !== lojaId)
        : [...atuais, lojaId],
    );

  // A barra e proporcional a maior loja do periodo, nao ao total: comparar
  // lojas entre si e a pergunta desta tela.
  const maiorTotal = Math.max(...itensDaLista.map((l) => l.total), 0);
  const quantidade = resumo.linhas.reduce((soma, l) => soma + l.saidas.length, 0);

  const carregando = lojas.isPending || fechamentos.isPending;
  const erro = lojas.error ?? fechamentos.error;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] md:px-[40px] pb-[60px]">
      <div className="flex flex-wrap items-center justify-between gap-[16px] py-[28px]">
        <div className="flex gap-[4px] rounded-[12px] border border-caixa-border bg-caixa-surface p-[4px]">
          {GRANULARIDADES.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={granularidade === valor}
              onClick={() => setGranularidade(valor)}
              className={`rounded-[10px] px-[18px] py-[9px] text-[15px] font-medium transition ${
                granularidade === valor
                  ? "bg-caixa-accent-soft text-caixa-accent"
                  : "text-caixa-muted hover:text-caixa-ink"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <BarraDoPeriodo
          modo={granularidade}
          valor={granularidade === "MES" ? mes : dia}
          rotulo={rotuloDoIntervalo}
          distintivo={ehPeriodoAtual ? "Atual" : null}
          atalho={
            ehPeriodoAtual
              ? undefined
              : {
                  rotulo: "Voltar para hoje",
                  aoClicar: () => {
                    setDia(hoje);
                    setMes(mesDe(hoje));
                  },
                }
          }
          aoAndar={passo}
          aoEscolher={escolherPeriodo}
        />
      </div>

      {erro && (
        <p className="mb-[20px] rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[20px] py-[16px] text-[14px] font-medium text-caixa-alerta">
          {erro instanceof Error ? erro.message : "Erro ao carregar as saídas."}
        </p>
      )}

      {/* O resumo do periodo, e nao quatro cartoes iguais: a pergunta desta
          tela e "quanto saiu e no que foi". O numero grande responde a
          primeira; a barra e a legenda respondem a segunda, e a legenda e o
          filtro — separar "resumo" de "controle" criaria duas linhas dizendo a
          mesma coisa.

          Retirada e consumo ficam embaixo da regua e fora do numero grande:
          nenhum dos dois e dinheiro perdido. A retirada mudou de mao mas
          continua sendo da empresa, e o consumo nem se moveu — somar qualquer
          um faria a tela cobrar da loja um dinheiro que ninguem perdeu. */}
      <section className="cartao-caixa-grande mb-[20px] grid grid-cols-1 items-center gap-[22px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[20px] md:px-[28px] md:py-[24px] lg:grid-cols-[minmax(230px,320px)_1fr] lg:gap-[44px]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-caixa-muted">
            Saiu do caixa
          </p>
          <p className="my-[10px] text-[34px] font-bold leading-[1.05] tracking-[-1.2px] tabular-nums lg:text-[42px]">
            R$ {emReais(resumo.totais.tudo)}
          </p>
          <p className="text-[14px] text-caixa-muted">
            {quantidade === 1 ? "1 saída" : `${quantidade} saídas`} ·{" "}
            {resumo.linhas.length === 1
              ? "1 loja"
              : `${resumo.linhas.length} lojas`}{" "}
            · {rotuloDoIntervalo}
          </p>
        </div>

        <div className="flex flex-col gap-[10px]">
          <BarraDaComposicao valores={resumo.totais} />

          <div className="flex flex-col gap-[2px]">
            <ItemDaComposicao
              tipo="DESPESA"
              rotulo="Despesas"
              valor={resumo.totais.despesas}
              filtro={filtro}
              aoFiltrar={setFiltro}
            />
            <ItemDaComposicao
              tipo="DEVOLUCAO"
              rotulo="Devoluções"
              valor={resumo.totais.devolucoes}
              filtro={filtro}
              aoFiltrar={setFiltro}
            />

            {/* Abaixo da regua, o que a empresa NAO perdeu. Retirada e consumo
                aparecem para a gerencia acompanhar, e ficam fora do numero
                grande — cada um por um motivo diferente. */}
            <div className="mb-[2px] mt-[6px] border-t border-dashed border-caixa-border pt-[8px]" />

            <ItemDaComposicao
              tipo="RETIRADA"
              rotulo="Retiradas"
              valor={resumo.totais.retiradas}
              filtro={filtro}
              aoFiltrar={setFiltro}
            />
            <p className="mt-[-4px] pl-[19px] text-[12px] leading-[1.4] text-caixa-muted">
              O dono levou para guardar — o dinheiro continua da empresa.
            </p>
            <ItemDaComposicao
              tipo="CONSUMO"
              rotulo="Consumo"
              valor={resumo.totais.consumo}
              filtro={filtro}
              aoFiltrar={setFiltro}
            />
            <p className="mt-[-4px] pl-[19px] text-[12px] leading-[1.4] text-caixa-muted">
              Registrado para descontar depois — não saiu do caixa.
            </p>

            {/* Fora da regua de dinheiro tambem, mas por um motivo diferente
                do de cima: o desperdicio nao e R$ nenhum, e sim unidades — o
                catalogo nao tem preco. Ele nunca passa pelo formatador de
                moeda. */}
            <ItemDaComposicao
              tipo="DESPERDICIO"
              rotulo="Desperdício"
              valor={resumo.totais.desperdicio}
              formato="UNIDADES"
              filtro={filtro}
              aoFiltrar={setFiltro}
            />
            <p className="mt-[-4px] pl-[19px] text-[12px] leading-[1.4] text-caixa-muted">
              Em unidades, não em reais — o catálogo não tem preço.
            </p>
          </div>
        </div>
      </section>

      {carregando ? (
        <p className="rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px] md:py-[20px] text-[15px] text-caixa-muted">
          Carregando lançamentos...
        </p>
      ) : itensDaLista.length === 0 ? (
        <p className="rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px] md:py-[20px] text-[15px] leading-[1.5] text-caixa-muted">
          {filtro === "DESPESA"
            ? "Nenhuma despesa neste período."
            : filtro === "RETIRADA"
              ? "Nenhuma retirada neste período."
              : filtro === "DEVOLUCAO"
                ? "Nenhuma devolução neste período."
                : filtro === "CONSUMO"
                  ? "Ninguém consumiu neste período."
                  : filtro === "DESPERDICIO"
                    ? "Nenhum desperdício neste período."
                    : "Nada saiu da gaveta neste período."}{" "}
          Despesa, retirada, devolução, consumo e desperdício são lançados
          pela loja no formulário de fechamento.
        </p>
      ) : (
        <section className="cartao-caixa-grande overflow-hidden rounded-[12px] border border-caixa-border bg-caixa-surface">
          <header className="flex flex-wrap items-center justify-between gap-[12px] border-b border-caixa-border px-[16px] py-[16px] md:px-[24px] md:py-[18px]">
            <h2 className="text-[17px] font-bold leading-[1.2]">
              {porPessoa
                ? pessoas.length === 1
                  ? "1 pessoa consumiu"
                  : `${pessoas.length} pessoas consumiram`
                : porSalgado
                  ? salgados.length === 1
                    ? "1 salgado desperdiçado"
                    : `${salgados.length} salgados desperdiçados`
                : resumo.linhas.length === 1
                  ? "1 loja com saída"
                  : `${resumo.linhas.length} lojas com saída`}
            </h2>
            <div className="flex flex-wrap items-center gap-[12px]">
              <OrdemDaListagem
                valor={ordem}
                aoMudar={setOrdem}
                emUnidades={porSalgado}
              />

              {/* Sem filtro nao ha nada a dizer aqui: a contagem esta no
                  resumo logo acima, e repeti-la so ocuparia a linha. */}
              {filtro !== "TODAS" && (
              // Com filtro ligado, o caminho de volta precisa estar aqui: a
              // lista encolhe, e sem isto parece que sumiu lancamento.
                <button
                  type="button"
                  onClick={() => setFiltro("TODAS")}
                  className="text-[13px] text-caixa-muted underline-offset-4 transition hover:text-caixa-ink hover:underline"
                >
                  Mostrando só {ROTULO_DO_FILTRO[filtro]} · ver todas
                </button>
              )}
            </div>
          </header>

          <ul className="flex flex-col">
            {porPessoa
              ? pessoas.map((linha) => (
                  <LinhaDaPessoa
                    key={linha.pessoaId}
                    linha={linha}
                    maiorTotal={maiorTotal}
                    aberta={abertas.includes(linha.pessoaId)}
                    aoAlternar={() => alternar(linha.pessoaId)}
                  />
                ))
              : porSalgado
                ? salgados.map((linha) => (
                    <LinhaDoSalgado
                      key={linha.salgadoId}
                      linha={linha}
                      maiorTotal={maiorTotal}
                      aberta={abertas.includes(linha.salgadoId)}
                      aoAlternar={() => alternar(linha.salgadoId)}
                    />
                  ))
              : resumo.linhas.map((linha) => (
                  <LinhaDaLoja
                    key={linha.lojaId}
                    linha={linha}
                    maiorTotal={maiorTotal}
                    aberta={abertas.includes(linha.lojaId)}
                    aoAlternar={() => alternar(linha.lojaId)}
                  />
                ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** As cores de cada tipo de saida. Uma so por tipo, e a mesma na barra, na
 *  legenda e na etiqueta da linha — e o que deixa a barra ser lida sem
 *  procurar a legenda. */
const COR_DO_TIPO: Record<TipoDeSaida, string> = {
  DESPESA: "bg-caixa-danger",
  RETIRADA: "bg-caixa-warn",
  DEVOLUCAO: "bg-caixa-alerta",
  CONSUMO: "bg-caixa-accent",
  // Nem cor de dinheiro perdido, nem cor de dinheiro a salvo: o desperdicio e
  // outra grandeza (unidades), e a cor neutra marca essa diferenca.
  DESPERDICIO: "bg-caixa-muted",
};

const ROTULO_DO_FILTRO: Record<Exclude<FiltroDeSaida, "TODAS">, string> = {
  DESPESA: "despesas",
  RETIRADA: "retiradas",
  DEVOLUCAO: "devoluções",
  CONSUMO: "consumo",
  DESPERDICIO: "desperdício",
};

/**
 * Por quanto, ou por nome.
 *
 * A lista sempre respondeu "quem gastou mais", que e a leitura de quem esta
 * procurando o que corrigir. A outra leitura e a de conferir alguem em
 * particular — e com 60 pessoas no consumo, procurar uma pelo tamanho da barra
 * nao e leitura nenhuma. Fica no cabecalho da lista, e nao ao lado do filtro:
 * ordem e da lista, filtro e do periodo inteiro.
 */
function OrdemDaListagem({
  valor,
  aoMudar,
  emUnidades = false,
}: {
  valor: OrdemDaLista;
  aoMudar: (ordem: OrdemDaLista) => void;
  /** No desperdicio a lista e de unidades, e "Maior valor" falaria de R$. */
  emUnidades?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Ordenar a lista"
      className="flex items-center gap-[2px] rounded-[9px] border border-caixa-border p-[3px]"
    >
      {(
        [
          ["VALOR", emUnidades ? "Mais unidades" : "Maior valor"],
          ["NOME", "A–Z"],
        ] as const
      ).map(([opcao, rotulo]) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={valor === opcao}
          onClick={() => aoMudar(opcao)}
          className={`rounded-[7px] px-[11px] py-[5px] text-[12px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent ${
            valor === opcao
              ? "bg-caixa-accent-soft text-caixa-accent"
              : "text-caixa-muted hover:text-caixa-ink"
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

/** A composicao do periodo inteiro, em uma barra. */
function BarraDaComposicao({
  valores,
}: {
  valores: {
    despesas: number;
    retiradas: number;
    devolucoes: number;
    consumo: number;
  };
}) {
  const total =
    valores.despesas + valores.retiradas + valores.devolucoes + valores.consumo;

  return (
    <span
      aria-hidden="true"
      className="mx-[8px] flex h-[14px] overflow-hidden rounded-full bg-caixa-faixa"
    >
      {(
        [
          ["DESPESA", valores.despesas],
          ["RETIRADA", valores.retiradas],
          ["DEVOLUCAO", valores.devolucoes],
          ["CONSUMO", valores.consumo],
        ] as const
      ).map(([tipo, valor]) => (
        <span
          key={tipo}
          className={COR_DO_TIPO[tipo]}
          style={{ width: total > 0 ? `${(valor / total) * 100}%` : "0%" }}
        />
      ))}
    </span>
  );
}

/** Uma linha da legenda — que tambem liga e desliga o filtro. */
function ItemDaComposicao({
  tipo,
  rotulo,
  valor,
  // "REAIS" e o padrao: so o desperdicio e unidade, e ele passa "UNIDADES"
  // explicitamente. Nunca passa pelo formatador de moeda — nao e dinheiro.
  formato = "REAIS",
  filtro,
  aoFiltrar,
}: {
  tipo: TipoDeSaida;
  rotulo: string;
  valor: number;
  formato?: "REAIS" | "UNIDADES";
  filtro: FiltroDeSaida;
  aoFiltrar: (filtro: FiltroDeSaida) => void;
}) {
  const ativo = filtro === tipo;

  return (
    <button
      type="button"
      aria-pressed={ativo}
      // Clicar no que ja esta ligado volta para todas: e o caminho mais curto
      // de volta, e o mesmo botao que ligou.
      onClick={() => aoFiltrar(ativo ? "TODAS" : tipo)}
      className={`flex w-full items-baseline gap-[10px] rounded-[8px] p-[8px] text-left transition ${
        ativo
          ? "bg-caixa-faixa shadow-[inset_0_0_0_1px_var(--color-caixa-border)]"
          : "hover:bg-caixa-faixa"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-[9px] w-[9px] shrink-0 rounded-[3px] ${COR_DO_TIPO[tipo]}`}
      />
      <span className="flex-1 text-[14px]">{rotulo}</span>
      <span className="text-[15px] font-semibold tabular-nums">
        {formato === "UNIDADES" ? `${valor} un` : `R$ ${emReais(valor)}`}
      </span>
    </button>
  );
}

/**
 * Uma pessoa e o que ela consumiu no periodo.
 *
 * Mesma forma da linha da loja, com tres diferencas que vem da pergunta ser
 * outra: a barra e de uma cor so (aqui a comparacao e entre pessoas, e nao
 * entre tipos de saida), a coluna do meio diz em quantas lojas ela passou — e
 * o que mostra que ela circula — e o detalhe troca a etiqueta do tipo pela
 * loja, porque nesta lista todo lancamento e consumo e dizer isso em cada
 * linha nao acrescenta nada.
 */
function LinhaDaPessoa({
  linha,
  maiorTotal,
  aberta,
  aoAlternar,
}: {
  linha: LinhaDeConsumo;
  maiorTotal: number;
  aberta: boolean;
  aoAlternar: () => void;
}) {
  return (
    <li className="border-t border-caixa-border first:border-t-0">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={aoAlternar}
        className={`flex w-full flex-wrap items-center gap-x-[20px] gap-y-[10px] px-[16px] py-[14px] text-left transition hover:bg-caixa-faixa md:flex-nowrap md:px-[24px] md:py-[16px] ${
          aberta ? "bg-caixa-faixa" : ""
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-[10px]">
          <svg
            aria-hidden="true"
            width="8"
            height="10"
            viewBox="0 0 8 10"
            fill="none"
            className={`shrink-0 text-caixa-muted transition-transform ${
              aberta ? "rotate-90" : ""
            }`}
          >
            <path
              d="M1.5 1L6 5L1.5 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate text-[15px] font-medium">{linha.nome}</span>
        </span>

        <span className="hidden w-[120px] shrink-0 truncate text-[13px] text-caixa-muted sm:block">
          {linha.lojas.length === 1
            ? linha.lojas[0]
            : `${linha.lojas.length} lojas`}
        </span>

        <span
          aria-hidden="true"
          className="order-3 h-[10px] w-full shrink-0 overflow-hidden rounded-full bg-caixa-faixa md:order-none md:w-[200px] lg:w-[220px]"
        >
          <span
            className="block h-full rounded-full bg-caixa-accent"
            style={{
              width: `${maiorTotal > 0 ? (linha.total / maiorTotal) * 100 : 0}%`,
            }}
          />
        </span>

        {/* Em tinta e sem o sinal de menos, como no resumo: este dinheiro nao
            saiu da gaveta, esta anotado para descontar depois. */}
        <span className="ml-auto shrink-0 text-right text-[16px] font-semibold tabular-nums md:ml-0 md:w-[130px]">
          R$ {emReais(linha.total)}
        </span>
      </button>

      {aberta && (
        <div className="ml-[16px] border-l-[3px] border-caixa-border bg-caixa-faixa md:ml-[24px]">
          {linha.saidas.map((saida) => (
            <div
              key={saida.id}
              className="flex flex-wrap items-baseline gap-x-[14px] gap-y-[6px] border-t border-caixa-border/60 px-[16px] py-[12px] text-[14px] first:border-t-0 md:px-[24px]"
            >
              <span className="w-[52px] shrink-0 tabular-nums text-caixa-muted">
                {diaCurto(saida.data)}
              </span>
              <span className="w-[54px] shrink-0 text-caixa-muted">
                {rotuloDoPeriodo(saida.periodo)}
              </span>
              <span className="min-w-0 flex-1 truncate leading-[1.4]">
                {saida.lojaNome}
              </span>
              <span className="ml-auto shrink-0 font-medium tabular-nums text-caixa-ink md:ml-0">
                R$ {emReais(saida.valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * Um salgado e quanto dele foi para o lixo no periodo.
 *
 * Mesma forma da linha da pessoa: o que muda e a grandeza. Tudo aqui e
 * unidade — nenhum numero passa por `emReais`, o catalogo nao tem preco. A
 * categoria vai ao lado do nome porque o nome repete entre familias.
 */
function LinhaDoSalgado({
  linha,
  maiorTotal,
  aberta,
  aoAlternar,
}: {
  linha: LinhaDeDesperdicio;
  maiorTotal: number;
  aberta: boolean;
  aoAlternar: () => void;
}) {
  return (
    <li className="border-t border-caixa-border first:border-t-0">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={aoAlternar}
        className={`flex w-full flex-wrap items-center gap-x-[20px] gap-y-[10px] px-[16px] py-[14px] text-left transition hover:bg-caixa-faixa md:flex-nowrap md:px-[24px] md:py-[16px] ${
          aberta ? "bg-caixa-faixa" : ""
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-[10px]">
          <svg
            aria-hidden="true"
            width="8"
            height="10"
            viewBox="0 0 8 10"
            fill="none"
            className={`shrink-0 text-caixa-muted transition-transform ${
              aberta ? "rotate-90" : ""
            }`}
          >
            <path
              d="M1.5 1L6 5L1.5 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate text-[15px] font-medium">
            {linha.nome}
            {linha.categoria && (
              <span className="font-normal text-caixa-muted"> · {linha.categoria}</span>
            )}
          </span>
        </span>

        <span className="hidden w-[120px] shrink-0 truncate text-[13px] text-caixa-muted sm:block">
          {linha.lojas.length === 1
            ? linha.lojas[0]
            : `${linha.lojas.length} lojas`}
        </span>

        <span
          aria-hidden="true"
          className="order-3 h-[10px] w-full shrink-0 overflow-hidden rounded-full bg-caixa-faixa md:order-none md:w-[200px] lg:w-[220px]"
        >
          <span
            className={`block h-full rounded-full ${COR_DO_TIPO.DESPERDICIO}`}
            style={{
              width: `${maiorTotal > 0 ? (linha.total / maiorTotal) * 100 : 0}%`,
            }}
          />
        </span>

        <span className="ml-auto shrink-0 text-right text-[16px] font-semibold tabular-nums md:ml-0 md:w-[130px]">
          {linha.total} un
        </span>
      </button>

      {aberta && (
        <div className="ml-[16px] border-l-[3px] border-caixa-border bg-caixa-faixa md:ml-[24px]">
          {linha.saidas.map((saida) => (
            <div
              key={saida.id}
              className="flex flex-wrap items-baseline gap-x-[14px] gap-y-[6px] border-t border-caixa-border/60 px-[16px] py-[12px] text-[14px] first:border-t-0 md:px-[24px]"
            >
              <span className="w-[52px] shrink-0 tabular-nums text-caixa-muted">
                {diaCurto(saida.data)}
              </span>
              <span className="w-[54px] shrink-0 text-caixa-muted">
                {rotuloDoPeriodo(saida.periodo)}
              </span>
              <span className="min-w-0 flex-1 truncate leading-[1.4]">
                {saida.lojaNome}
                <span className="text-caixa-muted"> · lançou {saida.nomeFuncionario}</span>
              </span>
              <span className="ml-auto shrink-0 font-medium tabular-nums text-caixa-ink md:ml-0">
                {saida.quantidade} un
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function LinhaDaLoja({
  linha,
  maiorTotal,
  aberta,
  aoAlternar,
}: {
  linha: LinhaDeSaidas;
  maiorTotal: number;
  aberta: boolean;
  aoAlternar: () => void;
}) {
  return (
    <li className="border-t border-caixa-border first:border-t-0">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={aoAlternar}
        className={`flex w-full flex-wrap items-center gap-x-[20px] gap-y-[10px] px-[16px] py-[14px] text-left transition hover:bg-caixa-faixa md:flex-nowrap md:px-[24px] md:py-[16px] ${
          aberta ? "bg-caixa-faixa" : ""
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-[10px]">
          {/* SVG e nao "▶": o caractere vira emoji colorido em alguns
              sistemas, e a seta apareceria laranja no meio da lista. */}
          <svg
            aria-hidden="true"
            width="8"
            height="10"
            viewBox="0 0 8 10"
            fill="none"
            className={`shrink-0 text-caixa-muted transition-transform ${
              aberta ? "rotate-90" : ""
            }`}
          >
            <path
              d="M1.5 1L6 5L1.5 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate text-[15px] font-medium">{linha.lojaNome}</span>
        </span>

        <span className="hidden w-[96px] shrink-0 text-[13px] text-caixa-muted sm:block">
          {linha.saidas.length === 1 ? "1 saída" : `${linha.saidas.length} saídas`}
        </span>

        {/* A barra diz no que o dinheiro foi sem precisar abrir a loja, que e
            a pergunta da tela. O comprimento compara as lojas entre si (fracao
            do maior total); as fatias, os tipos dentro da loja.

            No celular ela desce para uma linha propria em vez de sumir: e a
            unica leitura de composicao que cabe ali. */}
        {/* Duas camadas: o trilho tem largura fixa e e a regua da comparacao
            entre lojas; a barra dentro dele ocupa a fracao do maior total, e
            so entao as fatias dividem os tipos. Uma camada so faria a
            proporcao ser medida contra a linha inteira, e a loja que gastou
            metade apareceria do mesmo tamanho da que gastou tudo. */}
        <span
          aria-hidden="true"
          className="order-3 h-[10px] w-full shrink-0 overflow-hidden rounded-full bg-caixa-faixa md:order-none md:w-[200px] lg:w-[220px]"
        >
          <span
            className="flex h-full rounded-full"
            style={{
              width: `${maiorTotal > 0 ? (linha.total / maiorTotal) * 100 : 0}%`,
            }}
          >
            {(["DESPESA", "RETIRADA", "DEVOLUCAO", "CONSUMO"] as const).map((tipo) => (
              <span
                key={tipo}
                className={COR_DO_TIPO[tipo]}
                style={{
                  width: linha.total > 0
                    ? `${(linha.porTipo[tipo] / linha.total) * 100}%`
                    : "0%",
                }}
              />
            ))}
          </span>
        </span>

        <span className="ml-auto shrink-0 text-right text-[16px] font-semibold tabular-nums md:ml-0 md:w-[130px]">
          {/* Unidades, nao dinheiro — o desperdicio tem valor 0 por desenho.
              A loja que so desperdicou mostra so as unidades: "R$ 0,00" ali
              diria que houve uma saida de zero reais. NUNCA passa por
              `emReais`: 8 coxinhas formatadas como moeda leriam "R$ 8,00". */}
          {linha.total > 0 || linha.unidadesDesperdicadas === 0
            ? `R$ ${emReais(linha.total)}`
            : `${linha.unidadesDesperdicadas} un`}
          {linha.total > 0 && linha.unidadesDesperdicadas > 0 && (
            <span className="ml-[6px] text-[13px] font-normal tabular-nums text-caixa-muted">
              · {linha.unidadesDesperdicadas} un
            </span>
          )}
        </span>
      </button>

      {aberta && (
        <div className="ml-[16px] border-l-[3px] border-caixa-border bg-caixa-faixa md:ml-[24px]">
          {linha.saidas.map((saida) => (
            <div
              key={saida.id}
              className="flex flex-wrap items-baseline gap-x-[14px] gap-y-[6px] border-t border-caixa-border/60 px-[16px] py-[12px] text-[14px] first:border-t-0 md:px-[24px]"
            >
              <span className="w-[52px] shrink-0 tabular-nums text-caixa-muted">
                {diaCurto(saida.data)}
              </span>
              <span className="w-[54px] shrink-0 text-caixa-muted">
                {rotuloDoPeriodo(saida.periodo)}
              </span>
              <span
                className={`shrink-0 rounded-full px-[10px] py-[2px] text-[12px] font-semibold ${
                  saida.tipo === "DESPESA"
                    ? "bg-caixa-danger-soft text-caixa-danger"
                    : saida.tipo === "RETIRADA"
                      ? "bg-caixa-warn-soft text-caixa-warn"
                      : saida.tipo === "DEVOLUCAO"
                        ? "bg-caixa-alerta-soft text-caixa-alerta"
                        : saida.tipo === "CONSUMO"
                          // Consumo em verde, e nao em vermelho como os
                          // outros: a cor do prejuizo diria que o caixa
                          // fechou menor, e ele nao fechou.
                          ? "bg-caixa-accent-soft text-caixa-accent"
                          // Desperdicio em neutro: nao e dinheiro perdido nem
                          // dinheiro a salvo, e uma unidade a parte.
                          : "bg-caixa-border text-caixa-muted"
                }`}
              >
                {saida.tipo === "DESPESA"
                  ? "Despesa"
                  : saida.tipo === "RETIRADA"
                    ? "Retirada"
                    : saida.tipo === "DEVOLUCAO"
                      ? "Devolução"
                      : saida.tipo === "CONSUMO"
                        ? "Consumo"
                        : "Desperdício"}
              </span>
              <span className="order-last min-w-0 flex-[1_0_100%] leading-[1.4] md:order-none md:flex-1">
                {saida.descricao}
                <span className="text-caixa-muted"> · lançou {saida.nomeFuncionario}</span>
              </span>
              {/* Sem sinal de menos em nenhum: retirada e despesa voltam para
                  o total do caixa, e a devolucao ja se descontou sozinha. O
                  menos aqui ensinaria justamente a conta errada. A etiqueta do
                  tipo, ao lado, e quem diz o que aconteceu. O desperdicio nao
                  e R$: e a unica linha que mostra unidades, nunca moeda. */}
              <span className="ml-auto shrink-0 font-medium tabular-nums text-caixa-ink md:ml-0">
                {saida.tipo === "DESPERDICIO"
                  ? `${saida.quantidade} un`
                  : `R$ ${emReais(saida.valor)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
