"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Campo,
  CampoMoeda,
  CampoSelecao,
  CampoTexto,
  Pergunta,
  decimalParaDigitos,
  digitosParaDecimal,
} from "./campos";
import { emReais, rotuloDoPeriodo } from "../painel-dados";
import {
  assinaturaDoConsumo,
  consumoPelaMetade,
  consumosParaSalvar,
  type LinhaDeConsumoDoPainel,
} from "../consumo-editavel";
import type { LinhaDeDespesa } from "../despesas-do-turno";
import type {
  CamposEditaveis,
  FechamentoLido,
  ResponsavelDoPainel,
} from "../services/painel";

/**
 * O turno como esta na tela: digitos de centavos e texto cru, do jeito que os
 * campos falam. E o rascunho da gerencia — so vira correcao de verdade quando
 * ela aperta "Salvar alteracoes".
 */
type Rascunho = {
  dinheiro: string;
  pix: string;
  cartao: string;
  linkPagamento: string;
  houveRetirada: boolean;
  responsavelRetirada: string;
  valorRetirado: string;
  houveDespesa: boolean;
  despesas: LinhaDeDespesa[];
  houveDevolucao: boolean;
  devolucaoValor: string;
  houveDesperdicio: boolean;
  desperdicioDetalhes: string;
  houveConsumo: boolean;
  consumos: LinhaDeConsumoDoPainel[];
};

const doServidor = (fechamento: FechamentoLido): Rascunho => ({
  dinheiro: decimalParaDigitos(fechamento.dinheiro),
  pix: decimalParaDigitos(fechamento.pix),
  cartao: decimalParaDigitos(fechamento.cartao),
  linkPagamento: decimalParaDigitos(fechamento.link_pagamento),
  houveRetirada: fechamento.houve_retirada,
  responsavelRetirada: fechamento.responsavel_retirada ?? "",
  valorRetirado: decimalParaDigitos(fechamento.valor_retirado),
  houveDespesa: fechamento.despesas.length > 0,
  despesas: fechamento.despesas.map((despesa, indice) => ({
    chave: indice,
    descricao: despesa.descricao,
    valor: decimalParaDigitos(despesa.valor),
  })),
  houveDevolucao: fechamento.houve_devolucao,
  devolucaoValor: decimalParaDigitos(fechamento.devolucao_valor),
  houveDesperdicio: fechamento.houve_desperdicio,
  desperdicioDetalhes: fechamento.desperdicio_detalhes ?? "",
  houveConsumo: fechamento.consumos.length > 0,
  consumos: fechamento.consumos.map((consumo, indice) => ({
    chave: indice,
    encarregado: consumo.encarregado,
    valor: decimalParaDigitos(consumo.valor),
  })),
});

const centavos = (digitos: string) => Number(digitos || "0");

let proximaChave = 1000;
const novaLinhaDeDespesa = (): LinhaDeDespesa => ({
  chave: proximaChave++,
  descricao: "",
  valor: "",
});

const novaLinhaDeConsumo = (): LinhaDeConsumoDoPainel => ({
  chave: proximaChave++,
  encarregado: "",
  valor: "",
});

/**
 * Um turno ja lancado, aberto para correcao.
 *
 * A edicao fica em rascunho e so vai para o servidor no botao. Salvar campo a
 * campo, como a tela de estoque faz, gravava metade de uma correcao: trocar o
 * dinheiro e a despesa sao dois PATCHs, e entre eles o painel mostrava um
 * total que nunca existiu na gaveta. Aqui a gerencia mexe no que precisa,
 * confere o "ficou no caixa" e grava tudo de uma vez.
 */
export function TurnoEditavel({
  fechamento,
  responsaveis,
  quemConsome,
  onSalvar,
  onConferir,
  conferindo,
  onCancelar,
  onPendencia,
}: {
  fechamento: FechamentoLido;
  responsaveis: ResponsavelDoPainel[];
  /** Quem entra na lista de consumo. Outro cadastro, nao o de quem retira. */
  quemConsome: ResponsavelDoPainel[];
  onSalvar: (id: string, campos: CamposEditaveis) => Promise<unknown>;
  onConferir: (id: string) => void;
  conferindo: boolean;
  /** Cancela o lancamento (nao apaga: ele so sai dos relatorios e libera o
   *  turno para a loja lancar de novo). Sem prazo, diferente do botao que a
   *  loja tem — aqui e a gerencia decidindo, entao a janela de 20 minutos nao
   *  se aplica. */
  onCancelar: (id: string) => Promise<unknown>;
  /** Avisa a pagina que este turno tem edicao em aberto, para ela nao trocar
   *  de loja ou de dia por baixo de quem esta digitando. */
  onPendencia?: (id: string, pendente: boolean) => void;
}) {
  // `base` e o que ja esta gravado. Comeca no servidor e avanca a cada
  // salvamento: sem isso o rodape de "nao salvo" piscaria de novo no intervalo
  // entre o PATCH responder e a listagem voltar do refetch.
  const [base, setBase] = useState(() => doServidor(fechamento));
  const [rascunho, setRascunho] = useState(base);

  const [estado, setEstado] = useState<"salvando" | "salvo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const trocar = <C extends keyof Rascunho>(campo: C, valor: Rascunho[C]) =>
    setRascunho((atual) => ({ ...atual, [campo]: valor }));

  // Quem ja aparece no turno entra no seletor mesmo tendo saido da lista
  // depois — desativada ou desmarcada na tela da empresa. Sem isso o campo
  // abriria vazio no consumo dela, e salvar qualquer outra coisa no cartao
  // apagaria o desconto de alguem que ja comeu.
  const opcoesDeConsumo = useMemo(() => {
    const lista = [...quemConsome];
    for (const consumo of fechamento.consumos) {
      if (!lista.some((pessoa) => pessoa.id === consumo.encarregado)) {
        lista.push({ id: consumo.encarregado, nome: consumo.nome, ativo: false });
      }
    }
    return lista;
  }, [quemConsome, fechamento.consumos]);

  const mudou = (campo: keyof Rascunho) => rascunho[campo] !== base[campo];
  // Comparada pelo conteudo, nao pela referencia: cada tecla cria um array
  // novo, e comparar objeto marcaria "alterado" sem nada ter mudado.
  const listaDeDespesas = (linhas: LinhaDeDespesa[]) =>
    JSON.stringify(
      linhas.map((linha) => [linha.descricao.trim(), Number(linha.valor || "0")]),
    );

  const mudouTexto = (campo: "desperdicioDetalhes") =>
    rascunho[campo].trim() !== base[campo].trim();

  // Retirada, despesa e desperdicio andam em grupo: o backend recusa uma
  // despesa sem descricao, entao o que muda junto tem que ser gravado junto.
  const retiradaMudou =
    mudou("houveRetirada") || mudou("responsavelRetirada") || mudou("valorRetirado");
  const despesaMudou =
    listaDeDespesas(rascunho.despesas) !== listaDeDespesas(base.despesas);
  const devolucaoMudou =
    mudou("houveDevolucao") || mudou("devolucaoValor");
  const desperdicioMudou =
    mudou("houveDesperdicio") || mudouTexto("desperdicioDetalhes");
  // Pela assinatura, como as despesas: cada tecla cria um array novo.
  const consumoMudou =
    assinaturaDoConsumo(rascunho.houveConsumo ? rascunho.consumos : []) !==
    assinaturaDoConsumo(base.houveConsumo ? base.consumos : []);

  const alteracoes = [
    mudou("dinheiro") && "Dinheiro",
    mudou("pix") && "Pix",
    mudou("cartao") && "Cartão",
    mudou("linkPagamento") && "Link de pagamento",
    retiradaMudou && "Retirada",
    despesaMudou && "Despesa",
    devolucaoMudou && "Devolução",
    desperdicioMudou && "Desperdício",
    consumoMudou && "Consumo",
  ].filter((nome): nome is string => Boolean(nome));

  // O que ainda impede o salvamento. Sao as mesmas tres regras do serializer,
  // ditas antes da viagem: a dupla incompleta e o caminho normal de quem esta
  // digitando (a descricao vem antes do valor), nao um erro para mostrar em
  // vermelho depois que o servidor recusar.
  const pendencias = [
    rascunho.houveRetirada &&
      !(rascunho.responsavelRetirada && centavos(rascunho.valorRetirado) > 0) &&
      "Escolha quem retirou e informe o valor da retirada.",
    // Linha em branco sai sozinha no salvamento; pela metade, nao: sem valor
    // ela nao soma, sem descricao a contabilidade nao lanca.
    rascunho.houveDespesa &&
      rascunho.despesas.some(
        (linha) =>
          Boolean(linha.descricao.trim()) !== centavos(linha.valor) > 0,
      ) &&
      "Preencha a descrição e o valor de cada despesa.",
    rascunho.houveDevolucao &&
      centavos(rascunho.devolucaoValor) === 0 &&
      "Informe o valor devolvido.",
    rascunho.houveDesperdicio &&
      !rascunho.desperdicioDetalhes.trim() &&
      "Descreva o que foi perdido.",
    // Consumo vira desconto no pagamento da pessoa: uma linha pela metade
    // perdida em silencio some do total do mes dela.
    rascunho.houveConsumo &&
      consumoPelaMetade(rascunho.consumos) &&
      "Escolha a pessoa e informe o valor de cada consumo.",
  ].filter((texto): texto is string => Boolean(texto));

  const temAlteracoes = alteracoes.length > 0;
  const podeSalvar =
    temAlteracoes && pendencias.length === 0 && estado !== "salvando" && !cancelando;

  useEffect(() => {
    onPendencia?.(fechamento.id, temAlteracoes);
    return () => onPendencia?.(fechamento.id, false);
  }, [onPendencia, fechamento.id, temAlteracoes]);

  const salvar = async () => {
    if (!podeSalvar) return;

    const campos: CamposEditaveis = {};
    if (mudou("dinheiro")) campos.dinheiro = digitosParaDecimal(rascunho.dinheiro);
    if (mudou("pix")) campos.pix = digitosParaDecimal(rascunho.pix);
    if (mudou("cartao")) campos.cartao = digitosParaDecimal(rascunho.cartao);
    if (mudou("linkPagamento"))
      campos.link_pagamento = digitosParaDecimal(rascunho.linkPagamento);
    if (retiradaMudou) {
      campos.houve_retirada = rascunho.houveRetirada;
      campos.responsavel_retirada = rascunho.houveRetirada
        ? rascunho.responsavelRetirada
        : null;
      campos.valor_retirado = rascunho.houveRetirada
        ? digitosParaDecimal(rascunho.valorRetirado)
        : null;
    }
    if (despesaMudou) {
      // Linhas em branco caem aqui: a gerencia abriu mais uma e nao usou.
      campos.despesas = rascunho.houveDespesa
        ? rascunho.despesas
            .filter((linha) => linha.descricao.trim() && centavos(linha.valor) > 0)
            .map((linha) => ({
              descricao: linha.descricao.trim(),
              valor: digitosParaDecimal(linha.valor),
            }))
        : [];
    }
    if (devolucaoMudou) {
      campos.houve_devolucao = rascunho.houveDevolucao;
      campos.devolucao_valor = rascunho.houveDevolucao
        ? digitosParaDecimal(rascunho.devolucaoValor)
        : null;
    }
    if (consumoMudou) {
      campos.consumos = rascunho.houveConsumo
        ? consumosParaSalvar(rascunho.consumos)
        : [];
    }
    if (desperdicioMudou) {
      campos.houve_desperdicio = rascunho.houveDesperdicio;
      campos.desperdicio_detalhes = rascunho.houveDesperdicio
        ? rascunho.desperdicioDetalhes.trim()
        : null;
    }

    const gravado = rascunho;
    setErro(null);
    setEstado("salvando");
    try {
      await onSalvar(fechamento.id, campos);
      setBase(gravado);
      setEstado("salvo");
      window.setTimeout(() => setEstado(null), 2000);
    } catch (err) {
      setEstado(null);
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  };

  const descartar = () => {
    setRascunho(base);
    setErro(null);
  };

  // Cancelar concorre com salvar e conferir no mesmo lancamento: os tres
  // batem no mesmo registro no servidor, e o confirm() so trava o clique, nao
  // a viagem de rede. `cancelando` fecha os outros botoes durante essa janela,
  // do mesmo jeito que "salvando" ja fecha o de conferir.
  const cancelar = async () => {
    if (cancelando || estado === "salvando" || conferindo) return;

    const dataFormatada = fechamento.data.split("-").reverse().join("/");
    const certeza = window.confirm(
      `Cancelar o lançamento de ${rotuloDoPeriodo(fechamento.periodo)} de ${dataFormatada}? ` +
        "Ele sai dos relatórios e a loja pode lançar esse turno de novo." +
        (temAlteracoes
          ? " As alterações não salvas nesta tela serão descartadas."
          : ""),
    );
    if (!certeza) return;

    setErro(null);
    setCancelando(true);
    try {
      await onCancelar(fechamento.id);
      // Sem reset de `cancelando` no sucesso: a invalidacao de ["painel-caixa"]
      // tira este turno da lista, e o card desmonta sozinho.
    } catch (err) {
      setCancelando(false);
      setErro(err instanceof Error ? err.message : "Não foi possível cancelar.");
    }
  };

  const recebido =
    centavos(rascunho.dinheiro) +
    centavos(rascunho.pix) +
    centavos(rascunho.cartao) +
    centavos(rascunho.linkPagamento);
  // Retirada e despesa VOLTAM para o total: `dinheiro` e o que sobrou na
  // gaveta, e as duas sairam dali depois da venda. A devolucao nao volta —
  // cancelou a venda junto e ja se descontou sozinha no numero contado.
  const voltaParaOTotal =
    (rascunho.houveRetirada ? centavos(rascunho.valorRetirado) : 0) +
    (rascunho.houveDespesa
      ? rascunho.despesas.reduce((soma, l) => soma + centavos(l.valor), 0)
      : 0);

  const horaDoLancamento = new Date(fechamento.created_at).toLocaleTimeString(
    "pt-BR",
    { hour: "2-digit", minute: "2-digit" },
  );

  return (
    <article
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          salvar();
        }
      }}
      className={`cartao-caixa flex flex-col rounded-[12px] border bg-caixa-surface transition-colors ${
        temAlteracoes ? "border-caixa-warn/45" : "border-caixa-border"
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-[12px] border-b border-caixa-border px-[16px] py-[16px] md:px-[24px] md:py-[18px]">
        <div className="flex flex-col gap-[3px]">
          <h3 className="text-[17px] font-bold leading-[1.2]">
            {rotuloDoPeriodo(fechamento.periodo)}
          </h3>
          <p className="text-[13px] leading-[1.4] text-caixa-muted">
            {fechamento.nome_funcionario} · lançou às {horaDoLancamento}
            {fechamento.editado_por_nome &&
              ` · corrigido por ${fechamento.editado_por_nome}`}
          </p>
        </div>

        <div className="flex items-center gap-[14px]">
          {/* Texto simples, nao um botao com borda: cancelar precisa ser
              achavel, mas quem carrega a atencao nesta tela e "Salvar
              alteracoes" no rodape. */}
          <button
            type="button"
            onClick={cancelar}
            disabled={cancelando || estado === "salvando" || conferindo}
            className="text-[13px] font-medium text-caixa-alerta transition hover:underline disabled:opacity-45 disabled:hover:no-underline"
          >
            {cancelando ? "Cancelando..." : "Cancelar lançamento"}
          </button>

          <span
            aria-live="polite"
            className={`text-[13px] font-medium ${
              estado === "salvo" ? "text-caixa-accent" : "text-caixa-muted"
            }`}
          >
            {estado === "salvo" ? "Salvo" : estado === "salvando" ? "Salvando..." : ""}
          </span>

          {fechamento.conferido ? (
            <span className="rounded-full bg-caixa-accent-soft px-[12px] py-[5px] text-[13px] font-semibold text-caixa-accent">
              Conferido
              {fechamento.conferido_por_nome && ` · ${fechamento.conferido_por_nome}`}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onConferir(fechamento.id)}
              disabled={conferindo || temAlteracoes || cancelando}
              title={
                temAlteracoes
                  ? "Salve as alterações antes de marcar como conferido."
                  : undefined
              }
              className="rounded-[10px] border border-caixa-accent px-[16px] py-[8px] text-[14px] font-semibold text-caixa-accent transition hover:bg-caixa-accent-soft disabled:opacity-45"
            >
              {conferindo ? "Conferindo..." : "Marcar conferido"}
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-[28px] px-[16px] py-[18px] md:px-[24px] md:py-[22px] md:grid-cols-2">
        <div className="flex flex-col gap-[16px]">
          <span className="text-[12px] font-semibold tracking-[0.08em] text-caixa-muted">
            FORMAS DE PAGAMENTO
          </span>

          <Campo rotulo="DINHEIRO" htmlFor={`dinheiro-${fechamento.id}`}>
            <CampoMoeda
              id={`dinheiro-${fechamento.id}`}
              digitos={rascunho.dinheiro}
              onChange={(valor) => trocar("dinheiro", valor)}
            />
          </Campo>
          <Campo rotulo="PIX" htmlFor={`pix-${fechamento.id}`}>
            <CampoMoeda
              id={`pix-${fechamento.id}`}
              digitos={rascunho.pix}
              onChange={(valor) => trocar("pix", valor)}
            />
          </Campo>
          <Campo rotulo="CARTÃO" htmlFor={`cartao-${fechamento.id}`}>
            <CampoMoeda
              id={`cartao-${fechamento.id}`}
              digitos={rascunho.cartao}
              onChange={(valor) => trocar("cartao", valor)}
            />
          </Campo>
          <Campo rotulo="LINK DE PAGAMENTO" htmlFor={`link-${fechamento.id}`}>
            <CampoMoeda
              id={`link-${fechamento.id}`}
              digitos={rascunho.linkPagamento}
              onChange={(valor) => trocar("linkPagamento", valor)}
            />
          </Campo>
        </div>

        <div className="flex flex-col gap-[16px]">
          <span className="text-[12px] font-semibold tracking-[0.08em] text-caixa-muted">
            OUTRAS INFORMAÇÕES
          </span>

          <Pergunta
            rotulo="Houve retirada de dinheiro?"
            valor={rascunho.houveRetirada}
            onChange={(ligado) => trocar("houveRetirada", ligado)}
          >
            <Campo rotulo="QUEM RETIROU" htmlFor={`quem-${fechamento.id}`}>
              <CampoSelecao
                id={`quem-${fechamento.id}`}
                valor={rascunho.responsavelRetirada}
                onChange={(id) => trocar("responsavelRetirada", id)}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {responsaveis.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                  </option>
                ))}
              </CampoSelecao>
            </Campo>
            <Campo rotulo="VALOR RETIRADO" htmlFor={`retirado-${fechamento.id}`}>
              <CampoMoeda
                id={`retirado-${fechamento.id}`}
                digitos={rascunho.valorRetirado}
                onChange={(valor) => trocar("valorRetirado", valor)}
              />
            </Campo>
          </Pergunta>

          <Pergunta
            rotulo="Houve alguma despesa?"
            valor={rascunho.houveDespesa}
            onChange={(ligado) => {
              trocar("houveDespesa", ligado);
              if (ligado && rascunho.despesas.length === 0) {
                trocar("despesas", [novaLinhaDeDespesa()]);
              }
            }}
          >
            {rascunho.despesas.map((linha, indice) => (
              <div
                key={linha.chave}
                className="flex w-full flex-col gap-[10px] rounded-[10px] border border-caixa-border p-[12px]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-caixa-muted">
                    Despesa {indice + 1}
                  </span>
                  {rascunho.despesas.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        trocar(
                          "despesas",
                          rascunho.despesas.filter((l) => l.chave !== linha.chave),
                        )
                      }
                      className="text-[13px] font-medium text-caixa-muted underline underline-offset-2"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <CampoTexto
                  id={`desc-${fechamento.id}-${linha.chave}`}
                  valor={linha.descricao}
                  onChange={(valor) =>
                    trocar(
                      "despesas",
                      rascunho.despesas.map((l) =>
                        l.chave === linha.chave ? { ...l, descricao: valor } : l,
                      ),
                    )
                  }
                  placeholder="Ex.: gás, água, manutenção"
                />
                <Campo
                  rotulo="VALOR"
                  htmlFor={`despesa-${fechamento.id}-${linha.chave}`}
                >
                  <CampoMoeda
                    id={`despesa-${fechamento.id}-${linha.chave}`}
                    digitos={linha.valor}
                    onChange={(valor) =>
                      trocar(
                        "despesas",
                        rascunho.despesas.map((l) =>
                          l.chave === linha.chave ? { ...l, valor } : l,
                        ),
                      )
                    }
                  />
                </Campo>
              </div>
            ))}
            {rascunho.despesas.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  trocar("despesas", [...rascunho.despesas, novaLinhaDeDespesa()])
                }
                className="w-full rounded-[10px] border border-dashed border-caixa-accent px-[16px] py-[10px] text-[14px] font-semibold text-caixa-accent transition active:scale-[0.99]"
              >
                + Adicionar despesa
              </button>
            )}
          </Pergunta>

          <Pergunta
            rotulo="Houve devolução?"
            valor={rascunho.houveDevolucao}
            onChange={(ligado) => trocar("houveDevolucao", ligado)}
          >
            <Campo rotulo="VALOR DEVOLVIDO" htmlFor={`devolucao-${fechamento.id}`}>
              <CampoMoeda
                id={`devolucao-${fechamento.id}`}
                digitos={rascunho.devolucaoValor}
                onChange={(valor) => trocar("devolucaoValor", valor)}
              />
            </Campo>
          </Pergunta>

          {/* Consumo por ultimo, e de proposito: ele NAO e saida de caixa —
              ninguem pagou na hora, entao a gaveta nao mudou. Fica longe dos
              campos de dinheiro e fora do total la embaixo. */}
          <Pergunta
            rotulo="Houve consumo?"
            valor={rascunho.houveConsumo}
            onChange={(ligado) => {
              trocar("houveConsumo", ligado);
              if (ligado && rascunho.consumos.length === 0) {
                trocar("consumos", [novaLinhaDeConsumo()]);
              }
            }}
          >
            {rascunho.consumos.map((linha, indice) => (
              <div
                key={linha.chave}
                className="flex w-full flex-col gap-[10px] rounded-[10px] border border-caixa-border p-[12px]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-caixa-muted">
                    Consumo {indice + 1}
                  </span>
                  {rascunho.consumos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        trocar(
                          "consumos",
                          rascunho.consumos.filter((l) => l.chave !== linha.chave),
                        )
                      }
                      className="text-[13px] font-medium text-caixa-muted underline underline-offset-2"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {/* Lista, e nao texto livre como no formulario da loja: quem
                    corrige nao esta com a pessoa na frente, e um nome digitado
                    de novo parte o total do mes dela em dois. */}
                <Campo
                  rotulo="QUEM CONSUMIU"
                  htmlFor={`quem-consumiu-${fechamento.id}-${linha.chave}`}
                >
                  <CampoSelecao
                    id={`quem-consumiu-${fechamento.id}-${linha.chave}`}
                    valor={linha.encarregado}
                    onChange={(id) =>
                      trocar(
                        "consumos",
                        rascunho.consumos.map((l) =>
                          l.chave === linha.chave ? { ...l, encarregado: id } : l,
                        ),
                      )
                    }
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {opcoesDeConsumo.map((pessoa) => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome}
                        {pessoa.ativo ? "" : " (fora da lista)"}
                      </option>
                    ))}
                  </CampoSelecao>
                </Campo>
                <Campo
                  rotulo="VALOR"
                  htmlFor={`consumo-${fechamento.id}-${linha.chave}`}
                >
                  <CampoMoeda
                    id={`consumo-${fechamento.id}-${linha.chave}`}
                    digitos={linha.valor}
                    onChange={(valor) =>
                      trocar(
                        "consumos",
                        rascunho.consumos.map((l) =>
                          l.chave === linha.chave ? { ...l, valor } : l,
                        ),
                      )
                    }
                  />
                </Campo>
              </div>
            ))}
            {rascunho.consumos.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  trocar("consumos", [...rascunho.consumos, novaLinhaDeConsumo()])
                }
                className="w-full rounded-[10px] border border-dashed border-caixa-accent px-[16px] py-[10px] text-[14px] font-semibold text-caixa-accent transition active:scale-[0.99]"
              >
                + Adicionar consumo
              </button>
            )}
          </Pergunta>

          <Pergunta
            rotulo="Houve desperdício?"
            valor={rascunho.houveDesperdicio}
            onChange={(ligado) => trocar("houveDesperdicio", ligado)}
          >
            <Campo rotulo="O QUE FOI PERDIDO" htmlFor={`perda-${fechamento.id}`}>
              <textarea
                id={`perda-${fechamento.id}`}
                value={rascunho.desperdicioDetalhes}
                onChange={(e) => trocar("desperdicioDetalhes", e.target.value)}
                rows={3}
                placeholder="Descreva o que foi perdido e a quantidade"
                className="w-full resize-none rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px] text-[15px] leading-[1.4] text-caixa-ink outline-none transition placeholder:text-caixa-muted focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15"
              />
            </Campo>
          </Pergunta>
        </div>
      </div>

      {erro && (
        <p className="mx-[24px] mb-[16px] rounded-[10px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[14px] py-[12px] text-[14px] font-medium text-caixa-alerta">
          {erro}
        </p>
      )}

      {/* A barra so existe quando ha o que salvar, e ela mesma diz o que
          mudou: numa tela de correcao, "o que estou prestes a gravar" e a
          informacao que falta antes de apertar o botao. */}
      {temAlteracoes && (
        <div className="barra-alteracoes flex flex-wrap items-center justify-between gap-[14px] border-t border-caixa-warn/35 bg-caixa-warn-soft px-[16px] py-[12px] md:px-[24px] md:py-[14px]">
          <div className="flex min-w-0 flex-col gap-[7px]">
            {pendencias.length > 0 ? (
              <>
                <span className="text-[12px] font-semibold tracking-[0.08em] text-caixa-warn">
                  FALTA PREENCHER
                </span>
                {pendencias.map((texto) => (
                  <span key={texto} className="text-[14px] leading-[1.4] text-caixa-ink">
                    {texto}
                  </span>
                ))}
              </>
            ) : (
              <>
                <span className="text-[12px] font-semibold tracking-[0.08em] text-caixa-warn">
                  ALTERAÇÕES NÃO SALVAS
                </span>
                <span className="flex flex-wrap gap-[6px]">
                  {alteracoes.map((nome) => (
                    <span
                      key={nome}
                      className="rounded-full border border-caixa-warn/30 bg-caixa-surface px-[10px] py-[3px] text-[12px] font-medium text-caixa-ink"
                    >
                      {nome}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={descartar}
              disabled={estado === "salvando" || cancelando}
              className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[9px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink disabled:opacity-45"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={!podeSalvar}
              className="rounded-[10px] bg-caixa-accent px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-45 disabled:hover:brightness-100"
            >
              {estado === "salvando" ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      )}

      {/* O total acompanha o que esta digitado, nao o que ja foi salvo: e ele
          que a gerencia compara com a gaveta enquanto corrige. */}
      <footer className="flex flex-wrap items-center justify-between gap-[10px] rounded-b-[12px] bg-caixa-total px-[16px] py-[14px] md:px-[24px] md:py-[16px]">
        <div className="flex flex-wrap items-center gap-[18px] text-[14px] text-caixa-ink/80">
          <span>
            Na gaveta{" "}
            <span className="font-medium tabular-nums">
              R$ {emReais(recebido / 100)}
            </span>
          </span>
          {voltaParaOTotal > 0 && (
            <span>
              Retirada e despesas{" "}
              <span className="font-medium tabular-nums">
                + R$ {emReais(voltaParaOTotal / 100)}
              </span>
            </span>
          )}
        </div>
        <span className="flex items-baseline gap-[10px]">
          <span className="text-[14px] font-medium">Total do caixa</span>
          <span className="text-[22px] font-bold tabular-nums">
            R$ {emReais((recebido + voltaParaOTotal) / 100)}
          </span>
        </span>
      </footer>
    </article>
  );
}
