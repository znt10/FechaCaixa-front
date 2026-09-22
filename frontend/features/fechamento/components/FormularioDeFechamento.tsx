"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  Campo,
  CampoComLista,
  CampoMoeda,
  CampoSelecao,
  CampoTexto,
  Pergunta,
  TituloSecao,
  acharPeloNome,
  decimalParaDigitos,
  digitosParaDecimal,
  formatarMoeda,
} from "@/features/fechamento/components/campos";
import {
  montarConsumosDoTurno,
  type LinhaDeConsumo,
} from "@/features/fechamento/consumo-do-turno";
import {
  montarDespesasDoTurno,
  type LinhaDeDespesa,
} from "@/features/fechamento/despesas-do-turno";
import {
  linhaEditavelDoDesperdicio,
  montarDesperdiciosDoTurno,
  type LinhaDeDesperdicio,
} from "@/features/fechamento/desperdicio-do-turno";
import {
  assinarCorrecaoPendente,
  emMinutosESegundos,
  esquecerCorrecaoPendente,
  lerCorrecaoPendente,
  salvarCorrecaoPendente,
  semCorrecaoPendente,
} from "@/features/fechamento/correcao-pendente";
import {
  useAbrirCorrecao,
  useCancelarFechamentoDaLoja,
  useCorrigirFechamento,
  useEnviarFechamento,
  useEncarregados,
  useLojasDoFormulario,
  useResponsaveisRetirada,
  useSalgados,
  useTurnosDoDia,
} from "@/features/fechamento/hooks/useFechamento";
import { ehDomingo, hojeISO } from "@/features/fechamento/painel-dados";
import { RevisaoDoEnvio } from "@/features/fechamento/components/RevisaoDoEnvio";
import {
  montarRevisao,
  rotuloDoTurno,
} from "@/features/fechamento/revisao-do-envio";
import type {
  FechamentoConfirmacao,
  FechamentoParaCorrigir,
  FechamentoPayload,
  Periodo,
  Salgado,
} from "@/features/fechamento/services/fechamentos";
import type { Empresa } from "@/features/fechamento/services/acesso";
import {
  perguntaDePerda,
  perguntasVisiveis,
} from "@/features/fechamento/formulario-da-empresa";

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: "MANHA", rotulo: "Manhã" },
  { valor: "TARDE", rotulo: "Tarde" },
  { valor: "DOMINGO", rotulo: "Domingo" },
  { valor: "DIA", rotulo: "Dia inteiro" },
];

/** Para caber no meio de uma frase ("o envio da tarde"). */
const turnoNaFrase = (periodo: Periodo) =>
  periodo === "MANHA"
    ? "da manhã"
    : periodo === "TARDE"
      ? "da tarde"
      : periodo === "DOMINGO"
        ? "de domingo"
        : "do dia";

// Uma chave so, sem a empresa: o aparelho pertence a uma empresa de cada vez,
// e trocar de empresa passa pela tela do codigo, que limpa o que ficou.
const CHAVE_DO_APARELHO = "aparelho";

const periodoDaHora = (): Periodo =>
  new Date().getHours() < 12 ? "MANHA" : "TARDE";

/**
 * O formulario que a loja preenche.
 *
 * Nao decide mais qual empresa e a dele: quem responde por isso e o cookie do
 * aparelho, e a empresa chega pronta por prop — inclusive quantos fechamentos
 * ela faz por dia, que e o que decide se existe escolha de turno.
 */
export function FormularioDeFechamento({ empresa }: { empresa: Empresa }) {
  const lojas = useLojasDoFormulario();
  const responsaveis = useResponsaveisRetirada();
  const encarregados = useEncarregados();
  const salgados = useSalgados();
  const turnos = useTurnosDoDia();
  const enviar = useEnviarFechamento();
  const abrirCorrecao = useAbrirCorrecao();
  const corrigir = useCorrigirFechamento();

  const [loja, setLoja] = useState("");
  const [lancadoPor, setLancadoPor] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>(periodoDaHora);

  // Diz que o formulario abaixo esta editando esse lancamento em vez de criar
  // um novo.
  const [corrigindoId, setCorrigindoId] = useState<string | null>(null);

  // O payload pronto, esperando a loja conferir. Nao-nulo quer dizer que a
  // revisao esta no ar no lugar do formulario.
  const [emRevisao, setEmRevisao] = useState<FechamentoPayload | null>(null);

  // Enquanto o backend nao responde, o palpite vem da propria empresa: mostrar
  // "Dia inteiro" ao lado de manha e tarde seria oferecer dois modelos de
  // operacao que nunca convivem.
  //
  // Domingo entra no palpite porque e o unico motivo de turno unico que o
  // navegador sabe sozinho — feriado depende da lista que mora no backend.
  // Sem isso, todo domingo os dois botoes apareciam e sumiam na frente de quem
  // ja tinha comecado a preencher.
  const permitidos =
    turnos.data?.periodos ??
    (empresa.fechamentos_por_dia === 1
      ? (["DIA"] as Periodo[])
      : ehDomingo(hojeISO())
        ? (["DOMINGO"] as Periodo[])
        : (["MANHA", "TARDE"] as Periodo[]));
  const periodosDoDia = PERIODOS.filter(({ valor }) => permitidos.includes(valor));
  const motivoDoTurnoUnico = turnos.data?.motivo ?? null;

  // Derivado em vez de corrigido no estado: num domingo as 20h o palpite pela
  // hora daria "Tarde", que num domingo nao existe. Guardar a correcao no
  // estado faria a tela renderizar uma vez com o turno errado.
  //
  // Corrigindo, o turno do lancamento manda: a lista aqui e a de hoje, e uma
  // correcao feita depois da meia-noite (a janela e de 20 minutos, entao da
  // para atravessar) trocaria o turno de domingo pelo da segunda.
  const periodoEfetivo =
    corrigindoId || permitidos.includes(periodo) ? periodo : permitidos[0];

  // Uma lista so no servidor, dois seletores aqui. As marcas se cruzam de
  // proposito: o gerente fecha o caixa e tambem come, entao ele aparece nos
  // dois — quem decide e a tela da empresa, uma pessoa de cada vez.
  const pessoas = encarregados.data ?? [];
  const gerentes = pessoas.filter((pessoa) => pessoa.pode_lancar_caixa);
  const quemConsome = pessoas.filter((pessoa) => pessoa.pode_consumir);
  const nomesDosGerentes = gerentes.map((pessoa) => pessoa.nome);
  const nomesDeQuemConsome = quemConsome.map((pessoa) => pessoa.nome);

  // O catalogo de salgados, para a lista sugerida do desperdicio. Vazio
  // enquanto carrega ou quando ninguem cadastrou nada ainda — nos dois casos o
  // bloco nao aparece, porque desperdicio e opcional e nao pode virar parede
  // no meio do turno.
  const catalogo = salgados.data ?? [];
  // O que o seletor de uma linha NOVA pode oferecer: item ativo de categoria
  // ativa. `catalogo` continua completo (o endpoint devolve tudo de
  // proposito) porque uma correcao pode reidratar um item ja desativado — e
  // e por isso que `opcoesDoSeletor` recebe a linha junto, para incluir o
  // item que ela ja tem mesmo que ele nao esteja mais ativo.
  const catalogoAtivo = catalogo.filter(
    (item) => item.ativo && item.categoria_ativo,
  );
  const opcoesDoSeletor = (salgadoIdDaLinha: string): Salgado[] => {
    if (!salgadoIdDaLinha || catalogoAtivo.some((item) => item.id === salgadoIdDaLinha)) {
      return catalogoAtivo;
    }
    const jaEscolhido = catalogo.find((item) => item.id === salgadoIdDaLinha);
    return jaEscolhido ? [...catalogoAtivo, jaEscolhido] : catalogoAtivo;
  };
  // Agrupado por categoria e nao por uma lista so: e o dois-niveis do
  // catalogo (categoria > item) que faz "Coxinha" de "Salgados grande" e de
  // "Salgados mini" serem escolhas diferentes, e o <optgroup> e o que mostra
  // isso na tela em vez de duas linhas "Coxinha" indistinguiveis.
  const agruparPorCategoria = (itens: Salgado[]) => {
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
  };

  const [pix, setPix] = useState("");
  const [cartao, setCartao] = useState("");
  const [dinheiro, setDinheiro] = useState("");
  const [linkPagamento, setLinkPagamento] = useState("");

  const [houveRetirada, setHouveRetirada] = useState(false);
  const [responsavelRetirada, setResponsavelRetirada] = useState("");
  const [valorRetirado, setValorRetirado] = useState("");

  // Uma linha por gasto, como o consumo: o turno compra gas, agua e remedio no
  // mesmo expediente, e antes cabia um so — o resto ia empilhado num campo de
  // texto, onde nao soma e a contabilidade nao lanca.
  const [houveDespesa, setHouveDespesa] = useState(false);
  const [despesas, setDespesas] = useState<LinhaDeDespesa[]>([]);

  // O cliente pediu o dinheiro de volta. Fica registrada e NAO entra no total:
  // o dinheiro saiu da mesma gaveta que esta sendo contada, entao ela ja se
  // descontou sozinha.
  const [houveDevolucao, setHouveDevolucao] = useState(false);
  const [devolucaoValor, setDevolucaoValor] = useState("");

  // O formulario nao pergunta mais o desperdicio em texto livre — virou a
  // lista de itens do catalogo logo abaixo. `houve_desperdicio` e
  // `desperdicio_detalhes` continuam existindo no modelo e nas telas que os
  // leem (painel de fechamentos, planilha); so este formulario parou de
  // escrever neles.
  //
  // Uma linha por item do catalogo, como o consumo: a quantidade e inteira em
  // unidades, e nao dinheiro — o catalogo nao tem preco.
  const [houveDesperdicioDeItem, setHouveDesperdicioDeItem] = useState(false);
  const [desperdicios, setDesperdicios] = useState<LinhaDeDesperdicio[]>([]);

  // Uma linha por pessoa: quem lanca o caixa e o gerente, e ele registra o
  // que cada um comeu no turno. Antes era um valor so, sempre de quem estava
  // preenchendo — e as outras 40 pessoas da empresa nao apareciam.
  const [houveConsumo, setHouveConsumo] = useState(false);
  const [consumos, setConsumos] = useState<LinhaDeConsumo[]>([]);
  // Chave estavel por linha: com o indice, remover a do meio faria o React
  // reaproveitar o campo errado e o texto pularia de uma linha para a outra.
  const proximaChave = useRef(0);

  const novaLinhaDeConsumo = (nome = "", valor = ""): LinhaDeConsumo => ({
    chave: proximaChave.current++,
    nome,
    valor,
  });

  const novaLinhaDeDespesa = (descricao = "", valor = ""): LinhaDeDespesa => ({
    chave: proximaChave.current++,
    descricao,
    valor,
  });

  const novaLinhaDeDesperdicio = (salgadoId = "", quantidade = ""): LinhaDeDesperdicio => ({
    chave: proximaChave.current++,
    salgadoId,
    quantidade,
  });

  const alternarDespesa = (houve: boolean) => {
    setHouveDespesa(houve);
    setDespesas(houve && despesas.length === 0 ? [novaLinhaDeDespesa()] : despesas);
  };

  const mudarDespesa = (chave: number, campos: Partial<LinhaDeDespesa>) =>
    setDespesas((linhas) =>
      linhas.map((linha) =>
        linha.chave === chave ? { ...linha, ...campos } : linha,
      ),
    );

  const removerDespesa = (chave: number) =>
    setDespesas((linhas) => linhas.filter((linha) => linha.chave !== chave));

  const alternarConsumo = (houve: boolean) => {
    setHouveConsumo(houve);
    // Ligar a pergunta ja abre a primeira linha: a resposta "sim" sozinha nao
    // registra nada, e uma lista vazia deixaria a tela sem o proximo passo.
    setConsumos(houve && consumos.length === 0 ? [novaLinhaDeConsumo()] : consumos);
  };

  const mudarConsumo = (chave: number, campos: Partial<LinhaDeConsumo>) =>
    setConsumos((linhas) =>
      linhas.map((linha) =>
        linha.chave === chave ? { ...linha, ...campos } : linha,
      ),
    );

  const removerConsumo = (chave: number) =>
    setConsumos((linhas) => linhas.filter((linha) => linha.chave !== chave));

  const alternarDesperdicioDeItem = (houve: boolean) => {
    setHouveDesperdicioDeItem(houve);
    setDesperdicios(
      houve && desperdicios.length === 0 ? [novaLinhaDeDesperdicio()] : desperdicios,
    );
  };

  const mudarDesperdicio = (chave: number, campos: Partial<LinhaDeDesperdicio>) =>
    setDesperdicios((linhas) =>
      linhas.map((linha) =>
        linha.chave === chave ? { ...linha, ...campos } : linha,
      ),
    );

  const removerDesperdicio = (chave: number) =>
    setDesperdicios((linhas) => linhas.filter((linha) => linha.chave !== chave));

  // Quais perguntas opcionais esta empresa responde. O "houve" de cada uma
  // entra junto porque a correcao de um turno antigo reidrata o "sim": uma
  // pergunta desligada depois do envio continua na tela, senao o envio da
  // correcao iria sem ela e apagaria o que a loja lancou.
  const visiveis = perguntasVisiveis(empresa, {
    retirada: houveRetirada,
    despesa: houveDespesa,
    devolucao: houveDevolucao,
    consumo: houveConsumo,
    perda: houveDesperdicioDeItem,
  });
  const mostraPerda = visiveis.perda && catalogo.length > 0;
  const algumaPergunta =
    visiveis.retirada || visiveis.despesa || visiveis.devolucao || visiveis.consumo || mostraPerda;

  const [erro, setErro] = useState<string | null>(null);

  // O lancamento que acabou de sair daqui, enquanto a janela de correcao
  // estiver aberta. Vem do localStorage — e nao do estado — para que voltar ao
  // link depois de bloquear a tela nao custe a janela.
  const pendente = useSyncExternalStore(
    assinarCorrecaoPendente,
    () => lerCorrecaoPendente(CHAVE_DO_APARELHO),
    semCorrecaoPendente,
  );


  // O relogio anda de segundo em segundo; o prazo em si e uma conta pura
  // sobre `agora`, sem estado espelhado que possa ficar para tras.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!pendente) return;

    const relogio = setInterval(() => {
      setAgora(Date.now());
      if (Date.now() >= pendente.expiraEm) clearInterval(relogio);
    }, 1000);
    return () => clearInterval(relogio);
  }, [pendente]);

  const segundosRestantes = pendente
    ? Math.max(Math.ceil((pendente.expiraEm - agora) / 1000), 0)
    : 0;
  const podeCorrigir = segundosRestantes > 0;

  // Tudo em centavos (os campos guardam digitos), entao a conta e inteira e
  // nao acumula erro de ponto flutuante.
  const centavos = (digitos: string) => Number(digitos || "0");

  const recebidoEmCentavos = [dinheiro, pix, cartao, linkPagamento].reduce(
    (soma, valor) => soma + centavos(valor),
    0,
  );
  const despesasEmCentavos = houveDespesa
    ? despesas.reduce((soma, linha) => soma + centavos(linha.valor), 0)
    : 0;
  const retiradaEmCentavos = houveRetirada ? centavos(valorRetirado) : 0;

  // Retirada e despesa VOLTAM para o total: `dinheiro` e o que sobrou na
  // gaveta, e as duas sairam dali depois da venda — a venda valeu. A devolucao
  // nao volta, porque cancelou a venda junto e ja se descontou sozinha.
  const voltaParaOTotal = retiradaEmCentavos + despesasEmCentavos;
  const devolucaoEmCentavos = houveDevolucao ? centavos(devolucaoValor) : 0;

  const temVolta = voltaParaOTotal > 0;
  const naGaveta = formatarMoeda(String(recebidoEmCentavos));
  const totalDoCaixa = formatarMoeda(String(recebidoEmCentavos + voltaParaOTotal));

  const limpar = () => {
    setPix("");
    setCartao("");
    setDinheiro("");
    setLinkPagamento("");
    setHouveRetirada(false);
    setResponsavelRetirada("");
    setValorRetirado("");
    setHouveDespesa(false);
    setDespesas([]);
    setHouveDevolucao(false);
    setDevolucaoValor("");
    setHouveDesperdicioDeItem(false);
    setDesperdicios([]);
    setHouveConsumo(false);
    setConsumos([]);
  };

  /** Devolve o formulario ao estado em que a loja mandou. */
  const preencherCom = (lancamento: FechamentoParaCorrigir) => {
    setLoja(lancamento.loja);
    // O nome, e nao o id: o campo e digitavel, e e o texto que aparece nele.
    setLancadoPor(lancamento.nome_funcionario);
    setPeriodo(lancamento.periodo);
    setPix(decimalParaDigitos(lancamento.pix));
    setCartao(decimalParaDigitos(lancamento.cartao));
    setDinheiro(decimalParaDigitos(lancamento.dinheiro));
    setLinkPagamento(decimalParaDigitos(lancamento.link_pagamento));
    setHouveRetirada(lancamento.houve_retirada);
    setResponsavelRetirada(lancamento.responsavel_retirada ?? "");
    setValorRetirado(decimalParaDigitos(lancamento.valor_retirado));
    setHouveDespesa(lancamento.despesas.length > 0);
    setDespesas(
      lancamento.despesas.map((despesa) =>
        novaLinhaDeDespesa(despesa.descricao, decimalParaDigitos(despesa.valor)),
      ),
    );
    setHouveDevolucao(lancamento.houve_devolucao);
    setDevolucaoValor(decimalParaDigitos(lancamento.devolucao_valor));
    setHouveConsumo(lancamento.consumos.length > 0);
    setConsumos(
      lancamento.consumos.map((consumo) =>
        novaLinhaDeConsumo(consumo.nome, decimalParaDigitos(consumo.valor)),
      ),
    );
    // `houve_desperdicio`/`desperdicio_detalhes` (o texto livre antigo) nao
    // sao reidratados: este formulario nao pergunta mais isso, e o payload
    // agora omite as duas chaves — omitida e "nao mexi" para o servidor, e e
    // assim que um texto livre lancado antes desta mudanca sobrevive a uma
    // correcao de PIX feita depois dela.
    //
    // Mesmo padrao do consumo, mas para a lista de itens: sem reidratar aqui,
    // corrigir qualquer outro campo mandaria a lista vazia de volta e
    // apagaria o desperdicio do turno de tabela — o servidor so distingue
    // "nao mexi" de "nao teve nenhum" pela ausencia da chave, e o payload
    // sempre inclui "desperdicios".
    setHouveDesperdicioDeItem(lancamento.desperdicios.length > 0);
    setDesperdicios(
      lancamento.desperdicios.map((linha) =>
        linhaEditavelDoDesperdicio(linha, proximaChave.current++),
      ),
    );
  };

  /** Guarda a confirmacao e (re)abre a contagem com o prazo que o servidor
   *  informou. Corrigir nao renova nada: o backend continua contando do envio
   *  original, e o numero que volta ja vem menor. */
  const registrarEnvio = (confirmacao: FechamentoConfirmacao) => {
    setAgora(Date.now());
    salvarCorrecaoPendente(CHAVE_DO_APARELHO, {
      confirmacao,
      expiraEm: Date.now() + confirmacao.segundos_para_corrigir * 1000,
    });
  };

  const iniciarCorrecao = async () => {
    if (!pendente) return;
    setErro(null);

    try {
      // Busca no servidor em vez de reaproveitar o que estava na tela: o
      // aparelho pode ter sido reaberto, e corrigir por cima de uma copia
      // velha desfaria o que ja tinha sido salvo.
      const lancamento = await abrirCorrecao.mutateAsync(pendente.confirmacao.id);
      preencherCom(lancamento);
      setCorrigindoId(lancamento.id);
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Não foi possível abrir a correção.",
      );
    }
  };

  const cancelarCorrecao = () => {
    setCorrigindoId(null);
    setErro(null);
    limpar();
  };

  const lancarOutro = () => {
    esquecerCorrecaoPendente(CHAVE_DO_APARELHO);
    setCorrigindoId(null);
    setErro(null);
  };

  const cancelar = useCancelarFechamentoDaLoja();

  const cancelarLancamento = async () => {
    if (!pendente) return;
    // Confirmacao nativa: e uma pergunta de uma linha, e a tela do balcao nao
    // precisa de um modal proprio para ela.
    const certeza = window.confirm(
      "Cancelar este lançamento? Ele sai dos relatórios e o turno fica livre para lançar de novo.",
    );
    if (!certeza) return;

    try {
      await cancelar.mutateAsync(pendente.confirmacao.id);
      // Some a tela de confirmacao junto: sem isso a loja ficaria olhando o
      // cronometro de um lancamento que nao existe mais.
      esquecerCorrecaoPendente(CHAVE_DO_APARELHO);
      limpar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cancelar o lançamento.");
    }
  };

  const salvando = enviar.isPending || corrigir.isPending;

  // Os dois caminhos mexem no mesmo lancamento: enquanto um esta em voo, o
  // outro nao pode disparar. O window.confirm nao cobre isso — ele bloqueia
  // so a janela sincrona, nao o intervalo ate a resposta chegar.
  const desfazendoOuCorrigindo = abrirCorrecao.isPending || cancelar.isPending;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // O campo e digitavel, entao o que chega e texto. Quem vai no payload e a
    // pessoa do cadastro — e recusar aqui e melhor que deixar o backend
    // responder um 400 depois de a loja ter preenchido a tela inteira.
    const quemLancou = acharPeloNome(gerentes, lancadoPor);
    if (!quemLancou) {
      setErro(
        gerentes.length === 0
          ? "Nenhum gerente cadastrado ainda. Peça para marcar na tela Empresa quem lança o caixa."
          : "Escolha seu nome na lista.",
      );
      return;
    }

    const despesaDoTurno = montarDespesasDoTurno(houveDespesa ? despesas : []);
    if (!despesaDoTurno.ok) {
      setErro(despesaDoTurno.erro);
      return;
    }

    // Mesma ideia do nome de quem lanca: o campo e digitavel, entao a linha
    // so vale se casar com alguem do cadastro.
    const consumoDoTurno = montarConsumosDoTurno(
      houveConsumo ? consumos : [],
      quemConsome,
    );
    if (!consumoDoTurno.ok) {
      setErro(consumoDoTurno.erro);
      return;
    }

    // Mesma ideia: o campo do item tambem e digitavel, e so vale se casar com
    // o catalogo. Sem isso o backend responderia 400 depois de a loja ter
    // preenchido a tela inteira.
    const perdas = montarDesperdiciosDoTurno(
      houveDesperdicioDeItem ? desperdicios : [],
      catalogo,
      empresa,
    );
    if (!perdas.ok) {
      setErro(perdas.erro);
      return;
    }

    const payload = {
      loja,
      lancado_por: quemLancou.id,
      periodo: periodoEfetivo,
      pix: digitosParaDecimal(pix),
      cartao: digitosParaDecimal(cartao),
      dinheiro: digitosParaDecimal(dinheiro),
      link_pagamento: digitosParaDecimal(linkPagamento),
      houve_retirada: houveRetirada,
      responsavel_retirada: houveRetirada ? responsavelRetirada : null,
      valor_retirado: houveRetirada ? digitosParaDecimal(valorRetirado) : null,
      // Sempre presente, mesmo vazia, pela mesma razao do consumo: numa
      // correcao a lista enviada substitui a anterior.
      despesas: despesaDoTurno.despesas,
      houve_devolucao: houveDevolucao,
      devolucao_valor: houveDevolucao ? digitosParaDecimal(devolucaoValor) : null,
      // `houve_desperdicio`/`desperdicio_detalhes` (o texto livre) ficam de
      // fora de proposito: este formulario nao pergunta mais isso, e omitir
      // a chave e "nao mexi" para o servidor — mandar `false`/`null` aqui
      // apagaria um desperdicio escrito antes desta mudanca numa correcao de
      // qualquer outro campo.
      //
      // Sempre presente, mesmo vazia, pela mesma razao do consumo: numa
      // correcao a lista enviada substitui a anterior.
      desperdicios: perdas.desperdicios,
      // Sempre presente, mesmo vazia: numa correcao a lista enviada substitui
      // a anterior, e omiti-la e o que diz "nao mexi no consumo".
      consumos: consumoDoTurno.consumos,
    };

    // Nao envia ainda: guarda o payload e mostra a revisao. Guardado, e nao
    // remontado na hora do confirmar, para que o que a loja leu seja
    // literalmente o que vai — remontar abriria a chance de a tela mostrar um
    // numero e o envio levar outro.
    setEmRevisao(payload);
  };

  const confirmarEnvio = async () => {
    if (!emRevisao) return;
    setErro(null);

    try {
      const confirmacao = corrigindoId
        ? await corrigir.mutateAsync({ id: corrigindoId, payload: emRevisao })
        : await enviar.mutateAsync(emRevisao);

      registrarEnvio(confirmacao);
      setCorrigindoId(null);
      setEmRevisao(null);
      limpar();
    } catch (err) {
      // Fica na revisao com o erro: o payload continua guardado, entao tentar
      // de novo nao custa preencher a tela inteira outra vez.
      setErro(err instanceof Error ? err.message : "Erro ao enviar o fechamento.");
    }
  };

  const mostrandoConfirmacao = pendente !== null && corrigindoId === null;

  return (
    <div className="flex min-h-screen w-full justify-center bg-caixa-bg font-sans text-caixa-ink">
      <div className="flex w-full max-w-[390px] flex-col bg-caixa-surface">
        <header className="flex w-full flex-col gap-[6px] px-[24px] pb-[24px] pt-[56px]">
          <h1 className="text-[24px] font-bold leading-[1.25]">
            {corrigindoId
              ? "Corrigir fechamento"
              : `Fechamento de Caixa · ${empresa.nome}`}
          </h1>
          <p className="text-[14px] leading-[1.4] text-caixa-muted">
            {corrigindoId
              ? "Ajuste o que estiver errado e salve de novo."
              : "Preencha os valores do dia. Leva menos de um minuto."}
          </p>
        </header>

        {!lojas.isPending && (lojas.data ?? []).length === 0 && !pendente ? (
          <section className="flex w-full flex-col gap-[10px] px-[24px] pb-[32px]">
            <p className="rounded-[12px] border border-caixa-border bg-caixa-bg px-[18px] py-[16px] text-[15px] leading-[1.5] text-caixa-muted">
              Não encontramos lojas para este link. Confira com a gerência se o
              endereço do formulário está certo.
            </p>
          </section>
        ) : mostrandoConfirmacao ? (
          <section className="flex w-full flex-col gap-[20px] px-[24px] pb-[32px]">
            <div className="flex w-full flex-col gap-[10px] rounded-[12px] bg-caixa-accent-soft p-[18px] text-caixa-accent">
              <p className="text-[15px] font-medium">Fechamento enviado</p>
              <p className="text-[22px] font-bold">
                R${" "}
                {Number(pendente.confirmacao.total).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-[13px]">
                {pendente.confirmacao.loja_nome} ·{" "}
                {pendente.confirmacao.data.split("-").reverse().join("/")} ·{" "}
                {rotuloDoTurno(pendente.confirmacao.periodo)}
              </p>
            </div>

            {/* Fora do bloco verde, como no formulario: consumo nao entra no
                total do caixa. Aparece aqui porque e o unico momento em que o
                gerente reve de quem foi cada valor — e e ele quem responde por
                esse numero no fim do mes. */}
            {pendente.confirmacao.consumos?.length > 0 && (
              <div className="flex w-full flex-col gap-[10px] rounded-[12px] border border-caixa-border p-[18px]">
                <p className="text-[14px] font-medium">Consumo do turno</p>
                {pendente.confirmacao.consumos.map((consumo) => (
                  <div
                    key={consumo.id}
                    className="flex items-center justify-between gap-3 text-[14px]"
                  >
                    <span className="text-caixa-muted">{consumo.nome}</span>
                    <span className="font-medium tabular-nums">
                      R$ {formatarMoeda(decimalParaDigitos(consumo.valor))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* A janela de correcao e o unico assunto deste bloco, e ela tem
                hora para acabar — por isso o prazo vem antes do botao, e nao
                como observacao depois. */}
            {podeCorrigir ? (
              <div className="flex w-full flex-col gap-[12px] rounded-[12px] border border-caixa-border p-[18px]">
                <p className="text-[14px] leading-[1.45]">
                  Errou algum valor? Dá para corrigir por mais{" "}
                  <span className="font-semibold tabular-nums">
                    {emMinutosESegundos(segundosRestantes)}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  onClick={iniciarCorrecao}
                  disabled={desfazendoOuCorrigindo}
                  className="w-full rounded-[10px] border border-caixa-accent px-[20px] py-[14px] text-[15px] font-semibold text-caixa-accent transition active:scale-[0.99] disabled:opacity-60"
                >
                  {abrirCorrecao.isPending ? "Abrindo..." : "Corrigir lançamento"}
                </button>
                <button
                  type="button"
                  onClick={cancelarLancamento}
                  disabled={desfazendoOuCorrigindo}
                  className="w-full py-[4px] text-[14px] font-medium text-caixa-muted transition active:scale-[0.99] disabled:opacity-60"
                >
                  {cancelar.isPending ? "Cancelando..." : "Cancelar este lançamento"}
                </button>
              </div>
            ) : (
              <p className="rounded-[12px] border border-caixa-border bg-caixa-bg px-[18px] py-[16px] text-[14px] leading-[1.45] text-caixa-muted">
                O prazo de 20 minutos para corrigir terminou. Daqui em diante,
                só a gerência pode ajustar este lançamento.
              </p>
            )}

            {erro && (
              <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-[14px] py-[12px] text-[14px] font-medium text-red-600">
                {erro}
              </p>
            )}

            <button
              type="button"
              onClick={lancarOutro}
              className="w-full rounded-[12px] bg-caixa-accent px-[20px] py-[17px] text-[16px] font-semibold text-white transition active:scale-[0.99]"
            >
              Lançar outro fechamento
            </button>
          </section>
        ) : emRevisao ? (
          <RevisaoDoEnvio
            revisao={montarRevisao(emRevisao, {
              lojas: lojas.data ?? [],
              quemLanca: gerentes,
              quemConsome,
              responsaveis: responsaveis.data ?? [],
              catalogo,
              // O mesmo numero que o rodape do formulario acabou de mostrar:
              // recalcular aqui abriria a chance de os dois divergirem.
              total: totalDoCaixa,
            })}
            corrigindo={corrigindoId !== null}
            enviando={salvando}
            erro={erro}
            onVoltar={() => setEmRevisao(null)}
            onConfirmar={confirmarEnvio}
          />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-[20px] px-[24px] pb-[32px]"
          >
            {corrigindoId && (
              <div className="flex w-full items-center justify-between gap-[12px] rounded-[12px] bg-caixa-accent-soft px-[16px] py-[13px] text-caixa-accent">
                <span className="text-[14px] leading-[1.35]">
                  {/* Sem o lancamento em maos nao da para nomear o turno — e
                      "anterior" e verdade em qualquer um deles. */}
                  Corrigindo o envio{" "}
                  {pendente
                    ? turnoNaFrase(pendente.confirmacao.periodo)
                    : "anterior"}
                </span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums">
                  {emMinutosESegundos(segundosRestantes)}
                </span>
              </div>
            )}

            <Campo rotulo="LOJA" htmlFor="loja">
              <CampoSelecao id="loja" valor={loja} onChange={setLoja}>
                <option value="" disabled>
                  {lojas.isPending ? "Carregando lojas..." : "Selecione a loja"}
                </option>
                {(lojas.data ?? []).map((opcao) => (
                  <option key={opcao.id} value={opcao.id}>
                    {opcao.nome_loja}
                  </option>
                ))}
              </CampoSelecao>
            </Campo>

            <Campo rotulo="QUEM ESTÁ LANÇANDO" htmlFor="lancado-por">
              <CampoComLista
                id="lancado-por"
                valor={lancadoPor}
                onChange={setLancadoPor}
                opcoes={nomesDosGerentes}
                placeholder={
                  encarregados.isPending ? "Carregando..." : "Digite seu nome"
                }
              />
              {/* Lista vazia trava o formulario inteiro, e sem uma frase a
                  loja fica olhando um seletor que nao abre. */}
              {!encarregados.isPending && gerentes.length === 0 && (
                <p className="mt-[6px] text-[13px] text-caixa-muted">
                  Nenhum gerente cadastrado ainda. Peça para marcar na tela
                  Empresa quem lança o caixa.
                </p>
              )}
            </Campo>

            {/* O mockup nao traz periodo, mas o lancamento e por turno: sem ele
                dois turnos da mesma loja viram uma linha so no painel.

                Empresa de um fechamento por dia nao tem escolha para fazer —
                um botao unico e sempre marcado nao e uma pergunta, e so ocupa
                a tela de quem esta com pressa no fim do expediente. */}
            {periodosDoDia.length > 1 ? (
            <Campo rotulo="PERÍODO">
              <div className="flex w-full gap-[8px]">
                {periodosDoDia.map(({ valor, rotulo }) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={periodoEfetivo === valor}
                    onClick={() => setPeriodo(valor)}
                    className={`flex-1 rounded-[10px] border py-[13px] text-[15px] font-medium transition ${
                      periodoEfetivo === valor
                        ? "border-caixa-accent bg-caixa-accent-soft text-caixa-accent"
                        : "border-caixa-border bg-caixa-surface text-caixa-muted"
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </Campo>
            ) : (
              /* Sem escolha a fazer, mas com o porque na tela: o botao unico
                 sumia junto com a explicacao, e quem abria o formulario num
                 domingo nao entendia por que a manha e a tarde tinham
                 desaparecido. */
              motivoDoTurnoUnico && (
                <Campo rotulo="PERÍODO">
                  <p className="text-[14px] leading-[1.45] text-caixa-muted">
                    {motivoDoTurnoUnico}: a loja abre mais tarde e fecha mais
                    tarde, então é um lançamento só — o do dia inteiro.
                  </p>
                </Campo>
              )
            )}

            <TituloSecao>FORMAS DE PAGAMENTO</TituloSecao>

            {/* Dinheiro vem primeiro em toda a aplicacao: e o unico que fica
                fisicamente na gaveta e o unico que some sem deixar rastro. As
                outras formas a maquininha e o banco conferem sozinhos. */}
            <Campo rotulo="DINHEIRO" htmlFor="dinheiro">
              <CampoMoeda id="dinheiro" digitos={dinheiro} onChange={setDinheiro} />
            </Campo>
            <Campo rotulo="PIX" htmlFor="pix">
              <CampoMoeda id="pix" digitos={pix} onChange={setPix} />
            </Campo>
            <Campo rotulo="CARTÃO" htmlFor="cartao">
              <CampoMoeda id="cartao" digitos={cartao} onChange={setCartao} />
            </Campo>
            <Campo rotulo="LINK DE PAGAMENTO" htmlFor="link-pagamento">
              <CampoMoeda
                id="link-pagamento"
                digitos={linkPagamento}
                onChange={setLinkPagamento}
              />
            </Campo>

            {/* Tambem fora do mockup: sao as perguntas que a gerencia pediu e
                que o backend valida (retirada, despesa, devolucao,
                desperdicio). As tres de dinheiro vem juntas. */}
            {algumaPergunta && <TituloSecao>OUTRAS INFORMAÇÕES</TituloSecao>}

            {visiveis.retirada && (
              <Pergunta
                rotulo="Houve retirada de dinheiro?"
                valor={houveRetirada}
                onChange={setHouveRetirada}
              >
                <Campo rotulo="QUEM RETIROU" htmlFor="responsavel-retirada">
                  <CampoSelecao
                    id="responsavel-retirada"
                    valor={responsavelRetirada}
                    onChange={setResponsavelRetirada}
                  >
                    <option value="" disabled>
                      {responsaveis.isPending ? "Carregando..." : "Selecione"}
                    </option>
                    {(responsaveis.data ?? []).map((pessoa) => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome}
                      </option>
                    ))}
                  </CampoSelecao>
                </Campo>
                <Campo rotulo="VALOR RETIRADO" htmlFor="valor-retirado">
                  <CampoMoeda
                    id="valor-retirado"
                    digitos={valorRetirado}
                    onChange={setValorRetirado}
                  />
                </Campo>
              </Pergunta>
            )}

            {/* Uma linha por gasto: o expediente compra gas, agua e remedio no
                mesmo dia. Antes cabia uma so, e o resto ia empilhado na
                descricao — onde nao soma e a contabilidade nao lanca. */}
            {visiveis.despesa && (
              <Pergunta
                rotulo="Houve alguma despesa?"
                valor={houveDespesa}
                onChange={alternarDespesa}
              >
                {despesas.map((linha, indice) => (
                  <div
                    key={linha.chave}
                    className="flex w-full flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px]"
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-caixa-muted">
                        Despesa {indice + 1}
                      </span>
                      {/* A primeira linha nao some: sem nenhuma, a resposta
                          "sim" ficaria sem o que preencher. */}
                      {despesas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerDespesa(linha.chave)}
                          className="text-[13px] font-medium text-caixa-muted underline underline-offset-2"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <CampoTexto
                      id={`despesa-descricao-${linha.chave}`}
                      valor={linha.descricao}
                      onChange={(descricao) => mudarDespesa(linha.chave, { descricao })}
                      placeholder="Ex.: gás, água, manutenção"
                    />

                    <Campo
                      rotulo="VALOR"
                      htmlFor={`despesa-valor-${linha.chave}`}
                    >
                      <CampoMoeda
                        id={`despesa-valor-${linha.chave}`}
                        digitos={linha.valor}
                        onChange={(valor) => mudarDespesa(linha.chave, { valor })}
                      />
                    </Campo>
                  </div>
                ))}

                {despesas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDespesas([...despesas, novaLinhaDeDespesa()])}
                    className="w-full rounded-[10px] border border-dashed border-caixa-accent px-[16px] py-[12px] text-[14px] font-semibold text-caixa-accent transition active:scale-[0.99]"
                  >
                    + Adicionar despesa
                  </button>
                )}
              </Pergunta>
            )}

            {/* A unica pergunta cujo dinheiro saiu da gaveta E cancelou uma
                venda. Por isso ela nao entra no total la embaixo. */}
            {visiveis.devolucao && (
              <Pergunta
                rotulo="Houve devolução?"
                valor={houveDevolucao}
                onChange={setHouveDevolucao}
              >
                <Campo rotulo="VALOR DEVOLVIDO" htmlFor="devolucao-valor">
                  <CampoMoeda
                    id="devolucao-valor"
                    digitos={devolucaoValor}
                    onChange={setDevolucaoValor}
                  />
                </Campo>
              </Pergunta>
            )}

            {/* A pergunta de desperdicio em texto livre saiu daqui: virou a
                lista por item do catalogo, mais abaixo ("Perdeu algum
                salgado?"). Eram duas perguntas para o mesmo dado, na mesma
                tela, preenchidas pela mesma pessoa — e so uma delas o
                servidor consegue somar. O campo antigo continua existindo no
                modelo e nas telas que ja o leem (painel, planilha); so este
                formulario parou de escreve-lo. */}

            {/* Consumo fica por ultimo e FORA do bloco verde de totais: o
                resumo ali embaixo fala do dinheiro do caixa, e consumo nao e
                dinheiro que saiu da gaveta — a pessoa consumiu e nao pagou na
                hora. Somar os dois faria o fechamento acusar uma diferenca que
                nao existe.

                Uma linha por pessoa: quem preenche e o gerente, e ele diz o
                que cada um comeu no turno. */}
            {visiveis.consumo && (
              <Pergunta
                rotulo="Alguém consumiu?"
                valor={houveConsumo}
                onChange={alternarConsumo}
              >
                {consumos.map((linha, indice) => (
                  <div
                    key={linha.chave}
                    className="flex w-full flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px]"
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-caixa-muted">
                        Pessoa {indice + 1}
                      </span>
                      {/* A primeira linha nao some: sem nenhuma, a resposta
                          "sim" ficaria sem o que preencher. */}
                      {consumos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerConsumo(linha.chave)}
                          className="text-[13px] font-medium text-caixa-muted underline underline-offset-2"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <CampoComLista
                      id={`consumo-nome-${linha.chave}`}
                      valor={linha.nome}
                      onChange={(nome) => mudarConsumo(linha.chave, { nome })}
                      opcoes={nomesDeQuemConsome}
                      placeholder={
                        encarregados.isPending ? "Carregando..." : "Quem consumiu"
                      }
                    />

                    <Campo
                      rotulo="VALOR CONSUMIDO"
                      htmlFor={`consumo-valor-${linha.chave}`}
                    >
                      <CampoMoeda
                        id={`consumo-valor-${linha.chave}`}
                        digitos={linha.valor}
                        onChange={(valor) => mudarConsumo(linha.chave, { valor })}
                      />
                    </Campo>
                  </div>
                ))}

                {!encarregados.isPending && quemConsome.length === 0 ? (
                  <p className="text-[13px] leading-[1.45] text-caixa-muted">
                    Ninguém marcado para consumo. Peça para marcar na tela Empresa
                    quem pode consumir.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConsumos([...consumos, novaLinhaDeConsumo()])}
                    className="w-full rounded-[10px] border border-dashed border-caixa-accent px-[16px] py-[12px] text-[14px] font-semibold text-caixa-accent transition active:scale-[0.99]"
                  >
                    + Adicionar pessoa
                  </button>
                )}
              </Pergunta>
            )}

            {/* So aparece com catalogo cadastrado: desperdicio e opcional, e a
                loja esta com o caixa aberto e gente esperando — nao pode virar
                parede no meio do turno so porque ninguem cadastrou salgados
                ainda. */}
            {mostraPerda && (
              <Pergunta
                rotulo={perguntaDePerda(empresa)}
                valor={houveDesperdicioDeItem}
                onChange={alternarDesperdicioDeItem}
              >
                {desperdicios.map((linha, indice) => (
                  <div
                    key={linha.chave}
                    className="flex w-full flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px]"
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-caixa-muted">
                        Item {indice + 1}
                      </span>
                      {/* A primeira linha nao some: sem nenhuma, a resposta
                          "sim" ficaria sem o que preencher. */}
                      {desperdicios.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerDesperdicio(linha.chave)}
                          className="text-[13px] font-medium text-caixa-muted underline underline-offset-2"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    {/* Select por categoria, e nao o campo digitavel com lista
                        que o resto do formulario usa: o catalogo tem dois
                        niveis (categoria > item) precisamente porque o nome
                        repete — "Coxinha" existe em "Salgados grande" e em
                        "Salgados mini". Um campo de texto so devolveria o
                        nome, e quem resolvesse por nome so acharia o
                        primeiro — a familia "mini" nunca seria alcancada. O
                        <optgroup> mostra a categoria junto do nome, e o valor
                        que sai daqui e sempre o id do item, nunca o texto. */}
                    <Campo
                      rotulo="ITEM"
                      htmlFor={`desperdicio-item-${linha.chave}`}
                    >
                      <CampoSelecao
                        id={`desperdicio-item-${linha.chave}`}
                        valor={linha.salgadoId}
                        onChange={(salgadoId) => mudarDesperdicio(linha.chave, { salgadoId })}
                      >
                        <option value="" disabled>
                          {salgados.isPending ? "Carregando..." : "Selecione o item"}
                        </option>
                        {agruparPorCategoria(opcoesDoSeletor(linha.salgadoId)).map(
                          (grupo) => (
                            <optgroup key={grupo.categoria} label={grupo.categoria}>
                              {grupo.itens.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.nome}
                                </option>
                              ))}
                            </optgroup>
                          ),
                        )}
                      </CampoSelecao>
                    </Campo>

                    <Campo
                      rotulo="QUANTIDADE (UNIDADES)"
                      htmlFor={`desperdicio-quantidade-${linha.chave}`}
                    >
                      <CampoTexto
                        id={`desperdicio-quantidade-${linha.chave}`}
                        inputMode="numeric"
                        valor={linha.quantidade}
                        onChange={(quantidade) =>
                          mudarDesperdicio(linha.chave, {
                            quantidade: quantidade.replace(/\D/g, ""),
                          })
                        }
                        placeholder="Ex.: 8"
                      />
                    </Campo>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setDesperdicios([...desperdicios, novaLinhaDeDesperdicio()])}
                  className="w-full rounded-[10px] border border-dashed border-caixa-accent px-[16px] py-[12px] text-[14px] font-semibold text-caixa-accent transition active:scale-[0.99]"
                >
                  + Adicionar item
                </button>
              </Pergunta>
            )}

            {/* Este bloco e o que ensina a conta: o campo la em cima se chama
                so "DINHEIRO", e e o que sobrou na gaveta. Mostrar a retirada
                SOMANDO e o que faz o funcionario entender que ele digita o que
                tem na mao, e nao a venda do turno. */}
            <div className="flex w-full flex-col gap-[10px] rounded-[12px] bg-caixa-accent-soft p-[18px] text-caixa-accent">
              {temVolta && (
                <>
                  <div className="flex items-center justify-between text-[14px]">
                    <span>Na gaveta</span>
                    <span className="font-medium">R$ {naGaveta}</span>
                  </div>
                  {houveRetirada && (
                    <div className="flex items-center justify-between text-[14px]">
                      <span>Retirada</span>
                      <span className="font-medium">+ R$ {formatarMoeda(valorRetirado)}</span>
                    </div>
                  )}
                  {despesasEmCentavos > 0 && (
                    <div className="flex items-center justify-between text-[14px]">
                      <span>
                        {despesas.filter((l) => Number(l.valor || "0") > 0).length > 1
                          ? "Despesas"
                          : "Despesa"}
                      </span>
                      <span className="font-medium">
                        + R$ {formatarMoeda(String(despesasEmCentavos))}
                      </span>
                    </div>
                  )}
                  <div className="h-px w-full bg-caixa-accent/20" />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium leading-[1.4]">
                  {temVolta ? "Total do caixa" : "Total do dia"}
                </span>
                <span className="text-[22px] font-bold leading-[1.4]">
                  R$ {totalDoCaixa}
                </span>
              </div>

              {/* Fora da soma, e com o motivo escrito: sem a frase ela lê como
                  esquecimento — e "por que a devolução não desceu o total?" e
                  a primeira pergunta de quem confere. */}
              {devolucaoEmCentavos > 0 && (
                <p className="text-[13px] leading-[1.45] text-caixa-accent/80">
                  Devolução R$ {formatarMoeda(String(devolucaoEmCentavos))} — já
                  saiu da gaveta, não entra no total.
                </p>
              )}
            </div>

            {erro && (
              <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-[14px] py-[12px] text-[14px] font-medium text-red-600">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={!loja || salvando}
              className="w-full rounded-[12px] bg-caixa-accent px-[20px] py-[17px] text-[16px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Enviando..."
                : corrigindoId
                  ? "Salvar correção"
                  : "Enviar fechamento"}
            </button>

            {corrigindoId ? (
              <button
                type="button"
                onClick={cancelarCorrecao}
                className="w-full py-[4px] text-[14px] font-medium text-caixa-muted transition active:scale-[0.99]"
              >
                Cancelar e manter como estava
              </button>
            ) : (
              <p className="text-[13px] leading-[1.4] text-caixa-muted">
                Depois de enviar você tem 20 minutos para corrigir. Passado
                isso, só a gerência pode alterar.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
