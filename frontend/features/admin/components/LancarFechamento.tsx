"use client";

import React, { useId, useState } from "react";

import { Secao } from "@/features/admin/components/Secao";
import {
  DIAS_PARA_REPOR,
  dentroDaJanela,
  marcarOsDias,
  tomDoDia,
  turnoJaLancado,
} from "@/features/admin/reposicao-de-fechamento";
import {
  useFechamentosDoMes,
  useLancarFechamento,
  useSalgadosDoPainel,
  useTurnosDaData,
} from "@/features/admin/hooks/useReposicao";
import {
  useEncarregados,
  useLojasDaEmpresa,
  useMinhaEmpresa,
  useResponsaveis,
} from "@/features/admin/hooks/useEmpresa";
import { CalendarioDeDias } from "@/features/fechamento/components/BarraDoPeriodo";
import {
  Campo,
  CampoMoeda,
  CampoSelecao,
  CampoTexto,
  Pergunta,
  TituloSecao,
  formatarMoeda,
  digitosParaDecimal,
} from "@/features/fechamento/components/campos";
import {
  montarConsumosDoTurno,
  type LinhaDeConsumo,
} from "@/features/fechamento/consumo-do-turno";
import {
  montarDesperdiciosDoTurno,
  type LinhaDeDesperdicio,
} from "@/features/fechamento/desperdicio-do-turno";
import {
  montarDespesasDoTurno,
  type LinhaDeDespesa,
} from "@/features/fechamento/despesas-do-turno";
import { hojeISO, mesDe, rotuloDoDia } from "@/features/fechamento/painel-dados";
import { RevisaoDoEnvio } from "@/features/fechamento/components/RevisaoDoEnvio";
import { montarRevisao, rotuloDoTurno } from "@/features/fechamento/revisao-do-envio";
import type { Periodo, Salgado } from "@/features/fechamento/services/fechamentos";
import type { ReposicaoPayload } from "@/features/admin/services/reposicao";
import {
  perguntaDePerda,
  perguntasVisiveis,
} from "@/features/fechamento/formulario-da-empresa";

/**
 * Repor um dia que a loja esqueceu de fechar.
 *
 * O caixa sempre teve uma porta so: o formulario da loja, sem login, que lanca
 * o dia de hoje. Quando a loja esquece um turno, o dia fica com buraco e
 * ninguem tapa — a janela de correcao de 20 minutos ja fechou faz tempo, e o
 * formulario nao escolhe data.
 *
 * Sao os mesmos campos do formulario da loja, e de proposito: o que a gerencia
 * repoe tem que ser o mesmo dado que a loja teria mandado, ou o dia reposto
 * some dos relatorios que cruzam consumo, despesa e retirada. A unica diferenca
 * e o seletor de data no topo.
 *
 * Nao reusa o `FormularioDeFechamento` porque aquele arquivo e soldado ao
 * mundo sem login: cookie do aparelho, `localStorage` do aparelho, janela de
 * correcao, tela do codigo. O que da para reusar sem contorcer — os campos, a
 * montagem das linhas, a revisao — esta reusado aqui.
 */
export function LancarFechamento() {
  const [aberto, setAberto] = useState(false);

  return (
    <Secao
      titulo="Lançar fechamento"
      descricao="Repor um dia que a loja esqueceu de fechar."
    >
      {aberto ? (
        <Formulario aoFechar={() => setAberto(false)} />
      ) : (
        <div className="flex flex-col gap-[10px]">
          <p className="max-w-[70ch] text-[14px] leading-[1.5] text-caixa-muted">
            Mesmos campos do formulário da loja, com a data à escolha. Vale para
            os últimos {DIAS_PARA_REPOR} dias, e só onde ainda não há caixa
            lançado — turno já fechado se corrige na tela de fechamentos.
          </p>
          <div>
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="rounded-[10px] bg-caixa-accent px-[16px] py-[10px] text-[14px] font-semibold text-white transition active:scale-[0.99]"
            >
              Lançar um dia
            </button>
          </div>
        </div>
      )}
    </Secao>
  );
}

const PERIODOS_CONHECIDOS: Record<Periodo, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
  DOMINGO: "Domingo",
  DIA: "Dia inteiro",
};

function Formulario({ aoFechar }: { aoFechar: () => void }) {
  const id = useId();
  const hoje = hojeISO();

  const empresa = useMinhaEmpresa();
  const lojas = useLojasDaEmpresa();
  const encarregados = useEncarregados();
  const responsaveis = useResponsaveis();
  const salgados = useSalgadosDoPainel();

  const [data, setData] = useState("");
  // O mes que o calendario esta mostrando, para saber qual buscar. Comeca no
  // mes de hoje porque e onde o calendario abre.
  const [mesVisitado, setMesVisitado] = useState(() => mesDe(hoje));
  const [loja, setLoja] = useState("");
  const [periodo, setPeriodo] = useState<Periodo | "">("");

  const [pix, setPix] = useState("");
  const [cartao, setCartao] = useState("");
  const [dinheiro, setDinheiro] = useState("");
  const [linkPagamento, setLinkPagamento] = useState("");

  const [houveRetirada, setHouveRetirada] = useState(false);
  const [responsavelRetirada, setResponsavelRetirada] = useState("");
  const [valorRetirado, setValorRetirado] = useState("");

  const [houveDespesa, setHouveDespesa] = useState(false);
  const [despesas, setDespesas] = useState<LinhaDeDespesa[]>([
    { chave: 1, descricao: "", valor: "" },
  ]);

  const [houveDevolucao, setHouveDevolucao] = useState(false);
  const [devolucaoValor, setDevolucaoValor] = useState("");

  // Uma linha por item do catalogo, como no formulario da loja: o texto livre
  // antigo nao soma, e a tela de Saidas conta o desperdicio por salgado.
  const [houveDesperdicio, setHouveDesperdicio] = useState(false);
  const [desperdicios, setDesperdicios] = useState<LinhaDeDesperdicio[]>([
    { chave: 1, salgadoId: "", quantidade: "" },
  ]);

  const [houveConsumo, setHouveConsumo] = useState(false);
  const [consumos, setConsumos] = useState<LinhaDeConsumo[]>([
    { chave: 1, nome: "", valor: "" },
  ]);

  const [erro, setErro] = useState<string | null>(null);
  const [emRevisao, setEmRevisao] = useState<ReposicaoPayload | null>(null);
  const [enviado, setEnviado] = useState<{ dia: string; turno: string } | null>(null);

  const turnos = useTurnosDaData(data);
  const doMes = useFechamentosDoMes(mesVisitado);
  const enviar = useLancarFechamento();

  const ativos = <T extends { ativo: boolean }>(lista: T[] | undefined) =>
    (lista ?? []).filter((item) => item.ativo);

  const lojasAtivas = ativos(lojas.data);
  const quemLanca = ativos(encarregados.data).filter((p) => p.pode_lancar_caixa);
  const quemConsome = ativos(encarregados.data).filter((p) => p.pode_consumir);
  const responsaveisAtivos = ativos(responsaveis.data);
  const catalogo = salgados.data ?? [];
  // So item ativo de categoria ativa, como no formulario da loja. Aqui nao ha
  // correcao para reidratar item desativado: o lancamento e sempre novo.
  const catalogoAtivo = catalogo.filter((item) => item.ativo && item.categoria_ativo);

  // As mesmas perguntas que a loja responde: o que a gerencia repoe tem que
  // ser o mesmo dado que a loja teria mandado. Enquanto a empresa carrega,
  // `{}` conta como tudo ligado — melhor uma pergunta a mais por um instante
  // do que a gerencia sem onde lancar a retirada.
  const configuracao = empresa.data ?? {};
  const visiveis = perguntasVisiveis(configuracao, {
    retirada: houveRetirada,
    despesa: houveDespesa,
    devolucao: houveDevolucao,
    consumo: houveConsumo,
    perda: houveDesperdicio,
  });
  const algumaPergunta =
    visiveis.retirada || visiveis.despesa || visiveis.devolucao || visiveis.consumo || visiveis.perda;

  // Um turno so na resposta (domingo, feriado, ou empresa que fecha uma vez
  // por dia) nao e escolha: fica marcado sozinho. Perguntar seria oferecer uma
  // opcao que o servidor recusaria no envio.
  const periodosDoDia = turnos.data?.periodos ?? [];
  const periodoEfetivo: Periodo | "" =
    periodosDoDia.length === 1 ? periodosDoDia[0] : periodo;

  const lancamentosDoDia = (doMes.data ?? []).filter((l) => l.data === data);
  const jaLancado =
    Boolean(data && loja && periodoEfetivo) &&
    turnoJaLancado(lancamentosDoDia, loja, periodoEfetivo as Periodo);

  // A marca so aparece depois de escolhida a loja: o buraco e por loja, e
  // pintar a soma de todas diria que a terca esta fechada porque UMA das
  // quatro lojas fechou.
  const marca = loja
    ? marcarOsDias({
        doMes: doMes.data ?? [],
        loja,
        fechamentosPorDia: empresa.data?.fechamentos_por_dia ?? 2,
        hoje,
      })
    : null;

  // Centavos como inteiro o tempo todo: dividir por 100 so na hora de mostrar
  // nao acumula erro de ponto flutuante. Mesma conta do formulario da loja —
  // retirada e despesa VOLTAM para o total, a devolucao nao.
  const centavos = (digitos: string) => Number(digitos || "0");
  const recebidoEmCentavos = [dinheiro, pix, cartao, linkPagamento].reduce(
    (soma, valor) => soma + centavos(valor),
    0,
  );
  const despesasEmCentavos = houveDespesa
    ? despesas.reduce((soma, linha) => soma + centavos(linha.valor), 0)
    : 0;
  const retiradaEmCentavos = houveRetirada ? centavos(valorRetirado) : 0;
  const totalDoCaixa = formatarMoeda(
    String(recebidoEmCentavos + retiradaEmCentavos + despesasEmCentavos),
  );

  const dataValida = Boolean(data) && dentroDaJanela(data, hoje);
  const podeRevisar =
    dataValida && Boolean(loja) && Boolean(periodoEfetivo) && !jaLancado;

  const revisar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const despesaDoTurno = montarDespesasDoTurno(houveDespesa ? despesas : []);
    if (!despesaDoTurno.ok) {
      setErro(despesaDoTurno.erro);
      return;
    }

    const consumoDoTurno = montarConsumosDoTurno(
      houveConsumo ? consumos : [],
      quemConsome,
    );
    if (!consumoDoTurno.ok) {
      setErro(consumoDoTurno.erro);
      return;
    }

    if (houveRetirada && (!responsavelRetirada || centavos(valorRetirado) === 0)) {
      setErro("Informe quem retirou e o valor retirado.");
      return;
    }
    if (houveDevolucao && centavos(devolucaoValor) === 0) {
      setErro("Informe o valor devolvido.");
      return;
    }
    const perdas = montarDesperdiciosDoTurno(
      houveDesperdicio ? desperdicios : [],
      catalogo,
      configuracao,
    );
    if (!perdas.ok) {
      setErro(perdas.erro);
      return;
    }

    // Guardado, e nao remontado no confirmar: o que a gerencia leu tem que ser
    // literalmente o que vai.
    setEmRevisao({
      loja,
      // Nulo, e nao uma pessoa escolhida: quem repoe nao estava no turno.
      // Quem repos fica gravado no nome, carimbado pelo servidor a partir do
      // login — ver MARCA_DE_REPOSICAO no serializer.
      lancado_por: null,
      data,
      periodo: periodoEfetivo as Periodo,
      pix: digitosParaDecimal(pix),
      cartao: digitosParaDecimal(cartao),
      dinheiro: digitosParaDecimal(dinheiro),
      link_pagamento: digitosParaDecimal(linkPagamento),
      houve_retirada: houveRetirada,
      responsavel_retirada: houveRetirada ? responsavelRetirada : null,
      valor_retirado: houveRetirada ? digitosParaDecimal(valorRetirado) : null,
      despesas: despesaDoTurno.despesas,
      houve_devolucao: houveDevolucao,
      devolucao_valor: houveDevolucao ? digitosParaDecimal(devolucaoValor) : null,
      // Sem `houve_desperdicio`/`desperdicio_detalhes`: o texto livre saiu,
      // como no formulario da loja. O que vai e a lista por item.
      consumos: consumoDoTurno.consumos,
      desperdicios: perdas.desperdicios,
    });
  };

  const confirmar = async () => {
    if (!emRevisao) return;
    setErro(null);
    try {
      await enviar.mutateAsync(emRevisao);
      setEnviado({
        dia: rotuloDoDia(emRevisao.data),
        turno: rotuloDoTurno(emRevisao.periodo),
      });
      setEmRevisao(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível lançar.");
    }
  };

  if (enviado) {
    return (
      <div className="flex flex-col gap-[12px]">
        <p className="text-[15px] font-medium">
          Lançado: {enviado.dia}, {enviado.turno}.
        </p>
        <div className="flex flex-wrap gap-[8px]">
          <button
            type="button"
            onClick={() => setEnviado(null)}
            className="rounded-[10px] bg-caixa-accent px-[16px] py-[10px] text-[14px] font-semibold text-white transition active:scale-[0.99]"
          >
            Lançar outro dia
          </button>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-[10px] border border-caixa-border px-[16px] py-[10px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (emRevisao) {
    return (
      <RevisaoDoEnvio
        revisao={{
          ...montarRevisao(emRevisao, {
            lojas: lojasAtivas,
            quemLanca,
            quemConsome,
            responsaveis: responsaveisAtivos,
            catalogo,
            total: totalDoCaixa,
          }),
          // Sem o override a revisao diria "Não identificado", que e o rotulo
          // de cadastro apagado — aqui nao ha ninguem a identificar.
          lancadoPor: "Reposto pelo painel",
        }}
        corrigindo={false}
        enviando={enviar.isPending}
        erro={erro}
        onVoltar={() => setEmRevisao(null)}
        onConfirmar={confirmar}
      />
    );
  }

  return (
    <form onSubmit={revisar} className="flex flex-col gap-[16px]">
      {/* A loja vem antes do dia: e ela que decide quais dias tem buraco, e
          sem ela o calendario nao teria o que marcar. */}
      <Campo rotulo="Loja" htmlFor={`${id}-loja`}>
        <CampoSelecao
          id={`${id}-loja`}
          valor={loja}
          onChange={(nova) => {
            setLoja(nova);
            setData("");
            setPeriodo("");
          }}
        >
          <option value="">Escolha a loja</option>
          {lojasAtivas.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.nome_loja}
            </option>
          ))}
        </CampoSelecao>
      </Campo>

      {/* Sempre na tela, e nao escondido ate a loja ser escolhida: dia e turno
          sao o que esta tela promete, e um formulario que abre so com "Loja"
          parece nao ter os dois. Travado ate ter loja, porque e ela que decide
          quais dias tem buraco — mas travado e visivel, que e diferente de
          ausente. */}
      <div className="flex flex-col gap-[10px] rounded-[12px] border border-caixa-border p-[14px]">
        <p className="text-[12px] font-medium tracking-[0.24px] text-caixa-muted">
          DIA
        </p>
        {!loja && (
          <p className="text-[13px] text-caixa-muted">
            Escolha a loja e o calendário marca onde ela tem buraco.
          </p>
        )}
        <CalendarioDeDias
          diaISO={data || hoje}
          porSemana={false}
          aoEscolher={(dia) => {
            setData(dia);
            setPeriodo("");
          }}
          // So a janela dos 30 dias tranca o dia. A loja NAO tranca: ela
          // decide as bolinhas, e nada mais — travar o calendario ate ela ser
          // escolhida fazia o dia parecer nao clicavel, que e diferente de
          // fora do prazo. Enviar continua exigindo as duas coisas.
          diaDesabilitado={(dia) => !dentroDaJanela(dia, hoje)}
          tomDoDia={(dia) => {
            const estado = marca?.(dia);
            return estado ? tomDoDia(estado) : null;
          }}
          aoTrocarDeMes={setMesVisitado}
        />
        {loja && (
          <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] text-[12px] text-caixa-muted">
            <Chave classe="bg-caixa-danger-soft text-caixa-danger">
              sem fechamento
            </Chave>
            <Chave classe="bg-caixa-warn-soft text-caixa-warn">falta um turno</Chave>
            <Chave classe="bg-caixa-accent-soft text-caixa-accent">fechado</Chave>
          </div>
        )}
        {loja && doMes.isPending && (
          <p className="text-[12px] text-caixa-muted">Buscando o mês...</p>
        )}
      </div>

      {/* Quais turnos existem depende do dia — domingo e feriado viram um turno
          so — mas o CAMPO fica na tela desde o inicio, dizendo o que falta. */}
      <div className="sm:max-w-[50%]">
        <Campo rotulo="Turno" htmlFor={`${id}-periodo`}>
          {!data ? (
            <p className="rounded-[10px] border border-caixa-border bg-caixa-bg p-[14px] text-[15px] text-caixa-muted">
              Escolha o dia primeiro
            </p>
          ) : periodosDoDia.length === 1 ? (
            <p className="rounded-[10px] border border-caixa-border bg-caixa-bg p-[14px] text-[15px] text-caixa-ink">
              {PERIODOS_CONHECIDOS[periodosDoDia[0]]}
              {turnos.data?.motivo ? ` · ${turnos.data.motivo}` : ""}
            </p>
          ) : (
            <CampoSelecao
              id={`${id}-periodo`}
              valor={periodo}
              onChange={(novo) => setPeriodo(novo as Periodo)}
            >
              <option value="">
                {turnos.isPending ? "Carregando..." : "Escolha o turno"}
              </option>
              {periodosDoDia.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {PERIODOS_CONHECIDOS[opcao]}
                </option>
              ))}
            </CampoSelecao>
          )}
        </Campo>

      </div>

      {data && !dataValida && (
        <Aviso>
          Só dá para repor os últimos {DIAS_PARA_REPOR} dias, e nada no futuro.
        </Aviso>
      )}

      {jaLancado && (
        <Aviso>
          Este turno já tem caixa lançado. Para mudar o valor, use a correção na
          tela de fechamentos.
        </Aviso>
      )}

      <TituloSecao>O QUE ENTROU</TituloSecao>
      <div className="grid gap-[14px] sm:grid-cols-2">
        <Campo rotulo="Dinheiro na gaveta" htmlFor={`${id}-dinheiro`}>
          <CampoMoeda id={`${id}-dinheiro`} digitos={dinheiro} onChange={setDinheiro} />
        </Campo>
        <Campo rotulo="PIX" htmlFor={`${id}-pix`}>
          <CampoMoeda id={`${id}-pix`} digitos={pix} onChange={setPix} />
        </Campo>
        <Campo rotulo="Cartão" htmlFor={`${id}-cartao`}>
          <CampoMoeda id={`${id}-cartao`} digitos={cartao} onChange={setCartao} />
        </Campo>
        <Campo rotulo="Link de pagamento" htmlFor={`${id}-link`}>
          <CampoMoeda
            id={`${id}-link`}
            digitos={linkPagamento}
            onChange={setLinkPagamento}
          />
        </Campo>
      </div>

      {algumaPergunta && <TituloSecao>O QUE SAIU</TituloSecao>}

      {visiveis.retirada && (
        <Pergunta rotulo="Houve retirada?" valor={houveRetirada} onChange={setHouveRetirada}>
          <Campo rotulo="Quem retirou" htmlFor={`${id}-responsavel`}>
            <CampoSelecao
              id={`${id}-responsavel`}
              valor={responsavelRetirada}
              onChange={setResponsavelRetirada}
            >
              <option value="">Escolha a pessoa</option>
              {responsaveisAtivos.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.nome}
                </option>
              ))}
            </CampoSelecao>
          </Campo>
          <Campo rotulo="Valor retirado" htmlFor={`${id}-valor-retirado`}>
            <CampoMoeda
              id={`${id}-valor-retirado`}
              digitos={valorRetirado}
              onChange={setValorRetirado}
            />
          </Campo>
        </Pergunta>
      )}

      {visiveis.despesa && (
        <Pergunta rotulo="Houve despesa?" valor={houveDespesa} onChange={setHouveDespesa}>
          <Linhas
            linhas={despesas}
            aoMudar={setDespesas}
            nova={(chave) => ({ chave, descricao: "", valor: "" })}
            rotuloDoBotao="Adicionar despesa"
            renderizar={(linha, atualizar) => (
              <>
                <Campo rotulo="No que gastou" htmlFor={`${id}-despesa-${linha.chave}`}>
                  <CampoTexto
                    id={`${id}-despesa-${linha.chave}`}
                    valor={linha.descricao}
                    onChange={(descricao) => atualizar({ ...linha, descricao })}
                    placeholder="Gás, água, remédio..."
                  />
                </Campo>
                <Campo rotulo="Quanto" htmlFor={`${id}-despesa-valor-${linha.chave}`}>
                  <CampoMoeda
                    id={`${id}-despesa-valor-${linha.chave}`}
                    digitos={linha.valor}
                    onChange={(valor) => atualizar({ ...linha, valor })}
                  />
                </Campo>
              </>
            )}
          />
        </Pergunta>
      )}

      {visiveis.devolucao && (
        <Pergunta
          rotulo="Houve devolução?"
          valor={houveDevolucao}
          onChange={setHouveDevolucao}
        >
          <Campo rotulo="Valor devolvido" htmlFor={`${id}-devolucao`}>
            <CampoMoeda
              id={`${id}-devolucao`}
              digitos={devolucaoValor}
              onChange={setDevolucaoValor}
            />
          </Campo>
        </Pergunta>
      )}

      {visiveis.perda && (
        <Pergunta
          rotulo={perguntaDePerda(configuracao)}
          valor={houveDesperdicio}
          onChange={setHouveDesperdicio}
        >
          <Linhas
            linhas={desperdicios}
            aoMudar={setDesperdicios}
            nova={(chave) => ({ chave, salgadoId: "", quantidade: "" })}
            rotuloDoBotao="Adicionar item"
            renderizar={(linha, atualizar) => (
              <>
                {/* Select por categoria, e o valor e o id: "Coxinha" existe em
                    Salgados grande e em Salgados mini. */}
                <Campo rotulo="Item" htmlFor={`${id}-desperdicio-${linha.chave}`}>
                  <CampoSelecao
                    id={`${id}-desperdicio-${linha.chave}`}
                    valor={linha.salgadoId}
                    onChange={(salgadoId) => atualizar({ ...linha, salgadoId })}
                  >
                    <option value="">
                      {salgados.isPending ? "Carregando..." : "Escolha o item"}
                    </option>
                    {porCategoria(catalogoAtivo).map((grupo) => (
                      <optgroup key={grupo.categoria} label={grupo.categoria}>
                        {grupo.itens.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </CampoSelecao>
                </Campo>
                <Campo
                  rotulo="Quantidade (unidades)"
                  htmlFor={`${id}-desperdicio-quantidade-${linha.chave}`}
                >
                  <CampoTexto
                    id={`${id}-desperdicio-quantidade-${linha.chave}`}
                    inputMode="numeric"
                    valor={linha.quantidade}
                    onChange={(quantidade) =>
                      atualizar({ ...linha, quantidade: quantidade.replace(/\D/g, "") })
                    }
                    placeholder="Ex.: 8"
                  />
                </Campo>
              </>
            )}
          />
        </Pergunta>
      )}

      {visiveis.consumo && (
        <Pergunta rotulo="Alguém consumiu?" valor={houveConsumo} onChange={setHouveConsumo}>
          <Linhas
            linhas={consumos}
            aoMudar={setConsumos}
            nova={(chave) => ({ chave, nome: "", valor: "" })}
            rotuloDoBotao="Adicionar pessoa"
            renderizar={(linha, atualizar) => (
              <>
                <Campo rotulo="Quem" htmlFor={`${id}-consumo-${linha.chave}`}>
                  <CampoSelecao
                    id={`${id}-consumo-${linha.chave}`}
                    valor={linha.nome}
                    onChange={(nome) => atualizar({ ...linha, nome })}
                  >
                    <option value="">Escolha a pessoa</option>
                    {quemConsome.map((pessoa) => (
                      <option key={pessoa.id} value={pessoa.nome}>
                        {pessoa.nome}
                      </option>
                    ))}
                  </CampoSelecao>
                </Campo>
                <Campo rotulo="Quanto" htmlFor={`${id}-consumo-valor-${linha.chave}`}>
                  <CampoMoeda
                    id={`${id}-consumo-valor-${linha.chave}`}
                    digitos={linha.valor}
                    onChange={(valor) => atualizar({ ...linha, valor })}
                  />
                </Campo>
              </>
            )}
          />
        </Pergunta>
      )}

      <div className="flex items-center justify-between gap-3 rounded-[12px] bg-caixa-accent-soft px-[18px] py-[14px] text-caixa-accent">
        <span className="text-[15px] font-medium">Total do caixa</span>
        <span className="text-[22px] font-bold tabular-nums">R$ {totalDoCaixa}</span>
      </div>

      {erro && <Aviso>{erro}</Aviso>}

      <div className="flex flex-wrap gap-[8px]">
        <button
          type="submit"
          disabled={!podeRevisar}
          className="rounded-[10px] bg-caixa-accent px-[16px] py-[11px] text-[14px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Revisar e lançar
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border px-[16px] py-[11px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Uma entrada da legenda: o mesmo par de cor da celula, mais a palavra.
 *
 * O quadrado repete o formato do dia no calendario em vez de virar bolinha ou
 * pilula — a legenda so ensina se o olho reconhecer nela a mesma coisa que vai
 * procurar na grade.
 */
function Chave({ classe, children }: { classe: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-[6px]">
      <span
        aria-hidden="true"
        className={`flex h-[20px] w-[20px] items-center justify-center rounded-[6px] text-[11px] font-semibold ${classe}`}
      >
        1
      </span>
      {children}
    </span>
  );
}

/** O catalogo agrupado por familia, na ordem em que o servidor devolve. */
function porCategoria(itens: Salgado[]) {
  const grupos: { categoria: string; itens: Salgado[] }[] = [];
  for (const item of itens) {
    let grupo = grupos.find((g) => g.categoria === item.categoria_nome);
    if (!grupo) {
      grupo = { categoria: item.categoria_nome, itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push(item);
  }
  return grupos;
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-[14px] py-[12px] text-[14px] font-medium text-red-600">
      {children}
    </p>
  );
}

/**
 * A lista de linhas que cresce — despesas e consumo tem a mesma mecanica.
 *
 * `chave` e um contador, e nao o indice: apagar a linha do meio remontaria as
 * de baixo se a chave fosse posicional, e o campo em foco perderia o cursor.
 */
function Linhas<T extends { chave: number }>({
  linhas,
  aoMudar,
  nova,
  rotuloDoBotao,
  renderizar,
}: {
  linhas: T[];
  aoMudar: (linhas: T[]) => void;
  nova: (chave: number) => T;
  rotuloDoBotao: string;
  renderizar: (linha: T, atualizar: (linha: T) => void) => React.ReactNode;
}) {
  const atualizar = (linha: T) =>
    aoMudar(linhas.map((atual) => (atual.chave === linha.chave ? linha : atual)));

  return (
    <div className="flex flex-col gap-[12px]">
      {linhas.map((linha) => (
        <div key={linha.chave} className="grid gap-[10px] sm:grid-cols-2">
          {renderizar(linha, atualizar)}
          {linhas.length > 1 && (
            <button
              type="button"
              onClick={() => aoMudar(linhas.filter((a) => a.chave !== linha.chave))}
              className="justify-self-start text-[13px] font-medium text-caixa-muted underline"
            >
              Remover
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          aoMudar([
            ...linhas,
            nova(Math.max(0, ...linhas.map((linha) => linha.chave)) + 1),
          ])
        }
        className="self-start text-[13px] font-medium text-caixa-accent underline"
      >
        {rotuloDoBotao}
      </button>
    </div>
  );
}
