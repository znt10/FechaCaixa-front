"use client";

import { useState } from "react";

import type {
  Encarregado as EncarregadoNaTela,
  Funcionario as FuncionarioNaTela,
  LojaDaEmpresa as LojaNaTela,
} from "@/features/admin/services/empresa";
import { mascararCnpj } from "@/features/admin/cnpj";
import { LancarFechamento } from "@/features/admin/components/LancarFechamento";
import { Secao } from "@/features/admin/components/Secao";
import { useRecolhido } from "@/features/admin/hooks/useRecolhido";
import {
  useApagarFuncionario,
  useApagarLoja,
  useCriarFuncionario,
  useCriarLoja,
  useCriarResponsavel,
  useDefinirAtivoDaLoja,
  useDefinirAtivoDoFuncionario,
  useCriarEncarregado,
  useDesativarEncarregado,
  useDesativarResponsavel,
  useEditarEmpresa,
  useEditarEncarregado,
  useEditarLoja,
  useEncarregados,
  useReativarEncarregado,
  useFuncionarios,
  useGerarNovoCodigo,
  useLojasDaEmpresa,
  useMinhaEmpresa,
  useResponsaveis,
} from "@/features/admin/hooks/useEmpresa";

/**
 * A tela da empresa — do gerente.
 *
 * O painel responde "quanto deu hoje"; esta responde "quem pode lancar, de
 * onde, e quem pode tirar dinheiro do caixa". Sao as decisoes que ninguem toma
 * no meio do expediente — e que ate agora so davam pelo /admin/ do Django,
 * exigindo login de dono da plataforma para trocar um codigo de acesso.
 *
 * Ela ja foi exclusiva do Admin. Passou para o gerente porque e ele quem esta
 * na loja quando o celular novo precisa entrar, quando entra alguem novo que
 * retira dinheiro, quando chega outro gerente. Tudo aqui e escopado na
 * empresa DELE: o servidor tira a conta do login, e nenhuma destas chamadas
 * aceita "de qual empresa".
 */
export default function EmpresaPage() {
  // Cada secao busca o que precisa (o React Query junta as chamadas iguais);
  // aqui em cima so o que o cabecalho usa.
  const empresa = useMinhaEmpresa();
  // Trocar o codigo e mudar o regime moram em cartoes diferentes, mas dividem
  // um estado so: abertas ao mesmo tempo, lado a lado no grid, viravam duas
  // urgencias competindo, e nenhuma parecia esperar resposta.
  const [pergunta, setPergunta] = useState<PerguntaAberta>(null);

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-[20px] px-[16px] md:px-[40px] pb-[60px] pt-[28px]">
      <div className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">
          {empresa.data?.nome ?? "Minha empresa"}
        </h1>
        <p className="text-[14px] leading-[1.4] text-caixa-muted">
          Quem pode lançar, de onde, e quem pode tirar dinheiro do caixa.
        </p>
      </div>

      {empresa.error && <SemEmpresa erro={empresa.error} />}

      {!empresa.error && (
      <div className="grid items-start gap-[20px] lg:grid-cols-2">
        <CodigoDeAcesso
          aberta={pergunta === "codigo"}
          aoAbrir={() => setPergunta("codigo")}
          aoFechar={() => setPergunta(null)}
        />
        <Lojas />
        <FechamentosPorDia
          aberta={pergunta === "regime"}
          aoAbrir={() => setPergunta("regime")}
          aoFechar={() => setPergunta(null)}
        />
        <LancarFechamento />
        <Gerentes />
        <Funcionarios />
        <Responsaveis />
        <Ajudantes />
      </div>
      )}
    </main>
  );
}

/**
 * Login sem empresa — quase sempre o superusuario da plataforma.
 *
 * A regra e antiga e deliberada no projeto: quem nao tem conta vinculada ou e
 * dono da plataforma (enxerga todas) ou nao enxerga nenhuma; nao existe
 * meio-termo. Esta tela e da empresa, entao ela nao tem o que mostrar — mas
 * dizer isso e diferente de despejar o erro do servidor na cara de quem entrou.
 */
function SemEmpresa({ erro }: { erro: unknown }) {
  const semVinculo =
    erro instanceof Error && erro.message.includes("nao pertence a uma empresa");

  return (
    <section className="cartao-caixa rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px] md:py-[22px]">
      {semVinculo ? (
        <div className="flex flex-col gap-[10px]">
          <h2 className="text-[17px] font-bold leading-[1.2]">
            Este login não é de uma empresa
          </h2>
          <p className="max-w-[70ch] text-[15px] leading-[1.5] text-caixa-muted">
            Você entrou com o superusuário da plataforma, que enxerga todas as
            contas — e por isso não tem uma &quot;minha empresa&quot; para
            administrar. Esta tela é do gerente de uma empresa.
          </p>
          <p className="max-w-[70ch] text-[15px] leading-[1.5] text-caixa-muted">
            Entre com um login do grupo <strong>Gerente</strong> que tenha um{" "}
            <strong>Perfil de usuário</strong> apontando para a conta dela —
            é assim que o sistema sabe de qual empresa é a tela.
          </p>
        </div>
      ) : (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {erro instanceof Error
            ? erro.message
            : "Não foi possível carregar a empresa."}
        </p>
      )}
    </section>
  );
}

/**
 * O bloco que toda acao sem volta desta tela abre. Ele existe porque as tres
 * confirmacoes daqui — trocar o codigo, mudar o regime, apagar alguem —
 * estavam escritas tres vezes com tres formatos: nenhuma ensinava a proxima.
 *
 * A cor nao mede o susto, diz o tipo de estrago, e por isso sao dois niveis e
 * nao um "vermelho de perigo":
 *
 *   atencao (ocre) — volta atras. O codigo pode ser trocado de novo, o regime
 *                    tambem, e quem foi desativado pode ser reativado.
 *   perda   (tijolo) — nao volta. Apagar um funcionario apaga o nome dele dos
 *                    turnos que ele conferiu, e isso nao tem desfazer.
 *
 * A cor fica no aviso, nao no botao — menos em apagar. O que volta atras
 * confirma com o verde contornado de "Criar funcionario"; so apagar tem o
 * botao cheio, porque so ele nao volta. Cancelar tem borda vermelha nos dois,
 * como a saida marcada.
 *
 * Cancelar fica a DIREITA, ao contrario da convencao da web (Material, HIG,
 * GitHub poem a acao principal na direita). Duas razoes, e a segunda e a que
 * decide: o publico desta tela e de Windows, onde Cancelar sempre esteve na
 * direita; e numa tela em que tudo e irreversivel, quem clica no botao da
 * direita por habito acerta o Cancelar — o erro de clique nao faz nada.
 *
 * Cancelar se chama Cancelar. Rotulo comprido ("Manter o codigo atual") obriga
 * a ler para escapar, e escapar e justamente o que se faz sem querer ler.
 */
function Consequencia({
  nivel,
  children,
  rotuloConfirmar,
  confirmando,
  aoCancelar,
  aoConfirmar,
}: {
  nivel: "atencao" | "perda";
  children: React.ReactNode;
  rotuloConfirmar: string;
  confirmando?: boolean;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  const cores =
    nivel === "perda"
      ? {
          caixa: "border-caixa-danger/25 border-l-caixa-danger bg-caixa-danger-soft",
          // Cheio no tijolo: branco sobre ele da 6.9:1, e apagar e a unica
          // acao desta tela que nao volta — e a unica que fica pesada assim.
          botao:
            "bg-caixa-danger text-white hover:brightness-110 focus-visible:outline-caixa-danger",
        }
      : {
          caixa: "border-caixa-warn/25 border-l-caixa-warn bg-caixa-warn-soft",
          // Verde contornado sobre branco, o mesmo botao de "Criar
          // funcionario": o ocre fica no aviso, dizendo o peso da decisao, e
          // nao no botao. O fundo branco e o que faz ele saltar do ocre.
          botao:
            "border border-caixa-accent bg-caixa-surface text-caixa-accent hover:bg-caixa-accent-soft focus-visible:outline-caixa-accent",
        };

  return (
    <div
      // Nao e alertdialog: nao prende o foco nem bloqueia a tela, e dizer que
      // e um dialogo faria o leitor de tela prometer um comportamento que este
      // bloco nao tem. E uma regiao que se anuncia ao aparecer.
      role="group"
      aria-live="polite"
      className={`consequencia flex flex-col gap-[14px] rounded-[10px] border border-l-[4px] px-[16px] py-[14px] ${cores.caixa}`}
    >
      <p className="text-[14px] leading-[1.5] text-caixa-ink">{children}</p>
      <div className="flex flex-wrap items-center gap-[10px]">
        <button
          type="button"
          disabled={confirmando}
          onClick={aoConfirmar}
          className={`rounded-[10px] px-[18px] py-[10px] text-[14px] font-semibold transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${cores.botao}`}
        >
          {rotuloConfirmar}
        </button>
        <button
          type="button"
          // O foco chega no Cancelar: um Enter distraido nao pode ser o que
          // troca o codigo de todas as lojas.
          autoFocus
          onClick={aoCancelar}
          className="rounded-[10px] border border-caixa-danger/70 px-[18px] py-[10px] text-[14px] font-medium text-caixa-danger transition hover:border-caixa-danger hover:bg-caixa-danger-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-danger"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** O que a secao diz de si quando esta recolhida.
 *
 *  Recolhida sem resumo, a pessoa perde a informacao que ela veio buscar —
 *  quantas lojas existem, se alguma esta fora do painel. O resumo e o que
 *  sobra quando a lista some. */
function resumoDaLista(
  quantidade: number,
  singular: string,
  plural: string,
  extras: (string | null)[] = [],
) {
  const partes = [
    `${quantidade} ${quantidade === 1 ? singular : plural}`,
    ...extras.filter((extra): extra is string => Boolean(extra)),
  ];
  return partes.join(" · ");
}

/** O código é o que a gerência vem aqui ler: ele é o objeto da tela, não um
 *  campo dela — daí o tamanho e o espaçamento de letra. */
type PerguntaAberta = "codigo" | "regime" | null;

function CodigoDeAcesso({
  aberta,
  aoAbrir,
  aoFechar,
}: {
  aberta: boolean;
  aoAbrir: () => void;
  aoFechar: () => void;
}) {
  const empresa = useMinhaEmpresa();
  const novoCodigo = useGerarNovoCodigo();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!empresa.data) return;
    try {
      await navigator.clipboard.writeText(empresa.data.codigo_acesso);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard bloqueado (http sem localhost, permissao negada): o codigo
      // esta na tela em corpo 32, da para ler e digitar.
    }
  };

  return (
    <Secao
      titulo="Código de acesso"
      descricao="O que a loja digita para liberar um aparelho."
    >
      <div className="flex flex-wrap items-center gap-[14px]">
        <span className="rounded-[10px] border border-caixa-border bg-caixa-faixa px-[20px] py-[14px] text-[32px] font-bold leading-none tracking-[6px] tabular-nums">
          {empresa.data?.codigo_acesso ?? "····-····"}
        </span>
        <button
          type="button"
          onClick={copiar}
          className="rounded-[10px] border border-caixa-border px-[16px] py-[9px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>

      {aberta ? (
        <Consequencia
          nivel="atencao"
          rotuloConfirmar={
            novoCodigo.isPending ? "Gerando..." : "Gerar código novo"
          }
          confirmando={novoCodigo.isPending}
          aoCancelar={aoFechar}
          aoConfirmar={() =>
            novoCodigo.mutate(undefined, { onSuccess: aoFechar })
          }
        >
          Gerar um código novo <strong>desconecta todos os aparelhos</strong>.
          Cada loja vai precisar digitar o código novo antes do próximo
          lançamento.
        </Consequencia>
      ) : (
        <button
          type="button"
          onClick={aoAbrir}
          className="self-start rounded-[6px] text-[14px] font-medium text-caixa-muted underline-offset-4 transition hover:text-caixa-warn hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-warn"
        >
          Gerar um código novo
        </button>
      )}

    </Secao>
  );
}

function NovaLoja({ aoFechar }: { aoFechar: () => void }) {
  const criar = useCriarLoja();
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cnpj, setCnpj] = useState("");

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        criar.mutate(
          {
            nome: nome.trim(),
            cidade: cidade.trim(),
            endereco: endereco.trim(),
            cnpj: cnpj.trim(),
          },
          { onSuccess: aoFechar },
        );
      }}
      className="flex flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[16px] py-[14px]"
    >
      <div className="flex flex-wrap gap-[12px]">
        <Campo
          rotulo="Nome da loja"
          valor={nome}
          aoMudar={setNome}
          placeholder="Centro"
        />
        <Campo
          rotulo="Cidade"
          valor={cidade}
          aoMudar={setCidade}
          placeholder="Patos"
        />
      </div>
      <Campo
        rotulo="Endereço"
        valor={endereco}
        aoMudar={setEndereco}
        placeholder="Rua Epitácio Pessoa, 120"
      />
      <Campo
        rotulo="CNPJ"
        valor={cnpj}
        aoMudar={(bruto) => setCnpj(mascararCnpj(bruto))}
        placeholder="00.000.000/0000-00"
        opcional
        ajuda="É por ele que a nota fiscal encontra esta loja. Dá para preencher depois."
      />

      <p className="text-[13px] leading-[1.45] text-caixa-muted">
        Ela aparece no painel e no formulário assim que existir. Não precisa de
        e-mail nem senha: quem lança o caixa entra pelo código de acesso da
        empresa, no aparelho.
      </p>

      {criar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {criar.error instanceof Error
            ? criar.error.message
            : "Não foi possível criar a loja."}
        </p>
      )}

      <div className="flex flex-wrap gap-[10px]">
        <button
          type="submit"
          disabled={
            criar.isPending || !nome.trim() || !cidade.trim() || !endereco.trim()
          }
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {criar.isPending ? "Criando..." : "Criar loja"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[10px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Corrigir o cadastro de uma loja.
 *
 * Mesmo formulario da criacao, com os valores de hoje dentro: nome errado na
 * loja aparece no painel, no formulario e em cada lancamento. Sem editar, o
 * conserto seria criar outra e desativar a antiga, partindo o historico em
 * duas lojas.
 */
function EditarLoja({
  loja,
  aoFechar,
}: {
  loja: LojaNaTela;
  aoFechar: () => void;
}) {
  const editar = useEditarLoja();
  const [nome, setNome] = useState(loja.nome_loja);
  const [cidade, setCidade] = useState(loja.cidade);
  const [endereco, setEndereco] = useState(loja.endereco ?? "");
  // Vem crus do servidor e entram pontuados: o campo mostra o CNPJ do mesmo
  // jeito que ele esta no contrato que a gerente tem na mao para conferir.
  const [cnpj, setCnpj] = useState(mascararCnpj(loja.cnpj ?? ""));

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        editar.mutate(
          {
            id: loja.id,
            nome: nome.trim(),
            cidade: cidade.trim(),
            endereco: endereco.trim(),
            cnpj: cnpj.trim(),
          },
          { onSuccess: aoFechar },
        );
      }}
      className="flex flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[16px] py-[14px]"
    >
      <div className="flex flex-wrap gap-[12px]">
        <Campo rotulo="Nome da loja" valor={nome} aoMudar={setNome} />
        <Campo rotulo="Cidade" valor={cidade} aoMudar={setCidade} />
      </div>
      <Campo rotulo="Endereço" valor={endereco} aoMudar={setEndereco} />
      <Campo
        rotulo="CNPJ"
        valor={cnpj}
        aoMudar={(bruto) => setCnpj(mascararCnpj(bruto))}
        placeholder="00.000.000/0000-00"
        opcional
        ajuda="É por ele que a nota fiscal encontra esta loja."
      />

      {editar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {editar.error instanceof Error
            ? editar.error.message
            : "Não foi possível salvar."}
        </p>
      )}

      <div className="flex flex-wrap gap-[10px]">
        <button
          type="submit"
          disabled={
            editar.isPending || !nome.trim() || !cidade.trim() || !endereco.trim()
          }
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {editar.isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[10px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * As lojas da empresa.
 *
 * Nao existe apagar aqui, so desativar, e a diferenca nao e de cautela: a loja
 * e a dona de todo o caixa que ela ja lancou. Apagar levaria o historico
 * junto. Desativada, ela some do painel e do formulario e o passado continua
 * de pe.
 */
function Lojas() {
  const lojas = useLojasDaEmpresa();
  const [criando, setCriando] = useState(false);
  const [recolhido, alternarRecolhido] = useRecolhido("lojas");

  const lista = lojas.data ?? [];
  const foraDoPainel = lista.filter((loja) => !loja.ativo).length;
  // No resumo da secao recolhida: sem isso, descobrir que a nota fiscal nao
  // entra por falta de CNPJ exigiria abrir loja por loja.
  const semCnpj = lista.filter((loja) => !loja.cnpj).length;

  return (
    <Secao
      titulo="Lojas"
      descricao="Onde o caixa é lançado. Aparecem no painel e no formulário."
      resumo={resumoDaLista(lista.length, "loja", "lojas", [
        foraDoPainel > 0 ? `${foraDoPainel} fora do painel` : null,
        semCnpj > 0 ? `${semCnpj} sem CNPJ` : null,
      ])}
      // Criar loja com a secao recolhida abriria um formulario invisivel.
      recolhido={recolhido && !criando}
      aoAlternarRecolhido={alternarRecolhido}
      acao={
        !criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="rounded-[10px] border border-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-caixa-accent transition hover:bg-caixa-accent-soft"
          >
            Criar loja
          </button>
        )
      }
    >
      {criando && <NovaLoja aoFechar={() => setCriando(false)} />}

      {lojas.isPending ? (
        <p className="text-[14px] text-caixa-muted">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="max-w-[60ch] text-[14px] leading-[1.45] text-caixa-muted">
          Nenhuma loja cadastrada. Sem pelo menos uma, o formulário não tem o
          que oferecer para quem digitar o código de acesso.
        </p>
      ) : (
        <ul className="flex flex-col">
          {lista.map((loja) => (
            <LinhaDaLoja key={loja.id} loja={loja} />
          ))}
        </ul>
      )}
    </Secao>
  );
}

/**
 * Uma loja na lista.
 *
 * Apagar so aparece depois de desativar, como no funcionario — e aqui a
 * segunda trava pesa mais: FechamentoCaixa.loja e CASCADE, entao apagar uma
 * loja com caixa lancado apagaria o caixa junto. O servidor recusa esse caso,
 * e a recusa dele e o que a tela mostra, com o numero de lancamentos que
 * estao segurando a loja.
 */
function LinhaDaLoja({ loja }: { loja: LojaNaTela }) {
  const definirAtivo = useDefinirAtivoDaLoja();
  const apagar = useApagarLoja();
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [editando, setEditando] = useState(false);

  return (
    <li className="flex flex-col gap-[10px] border-t border-caixa-border py-[12px] first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <span className="flex flex-col gap-[2px]">
          <span className="flex flex-wrap items-center gap-[8px]">
            <span
              className={`text-[15px] font-medium ${
                loja.ativo ? "text-caixa-ink" : "text-caixa-muted"
              }`}
            >
              {loja.nome_loja}
            </span>
            {!loja.ativo && (
              <span className="rounded-full border border-caixa-warn/30 bg-caixa-warn-soft px-[10px] py-[2px] text-[12px] font-semibold text-caixa-warn">
                fora do painel
              </span>
            )}
          </span>
          <span className="text-[13px] text-caixa-muted">
            {loja.cidade}
            {loja.endereco ? ` · ${loja.endereco}` : ""}
            {loja.cnpj ? ` · ${mascararCnpj(loja.cnpj)}` : ""}
          </span>
          {/* Fica no lugar do CNPJ, e nao como selo ao lado do nome: o que
              falta aqui e um dado do cadastro, nao um estado da loja como
              "fora do painel". A loja funciona sem ele — so nao recebe nota. */}
          {!loja.cnpj && (
            <span className="text-[13px] text-caixa-warn">
              sem CNPJ · não recebe nota fiscal
            </span>
          )}
        </span>

        {!confirmandoApagar && !editando && (
          <div className="flex flex-wrap gap-[8px]">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-[10px] border border-caixa-border px-[14px] py-[8px] text-[13px] font-medium text-caixa-muted transition hover:border-caixa-accent/40 hover:bg-caixa-accent-soft hover:text-caixa-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
            >
              Editar
            </button>
            <button
              type="button"
              disabled={definirAtivo.isPending}
              onClick={() =>
                definirAtivo.mutate({ id: loja.id, ativo: !loja.ativo })
              }
              className={`rounded-[10px] border px-[14px] py-[8px] text-[13px] font-medium transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                loja.ativo
                  ? "border-caixa-border text-caixa-muted hover:border-caixa-warn/45 hover:bg-caixa-warn-soft hover:text-caixa-warn focus-visible:outline-caixa-warn"
                  : "border-caixa-accent/40 text-caixa-accent hover:bg-caixa-accent-soft focus-visible:outline-caixa-accent"
              }`}
            >
              {loja.ativo ? "Desativar" : "Reativar"}
            </button>
            {!loja.ativo && (
              <button
                type="button"
                onClick={() => setConfirmandoApagar(true)}
                className="rounded-[10px] border border-transparent px-[12px] py-[8px] text-[13px] font-medium text-caixa-danger/85 transition hover:border-caixa-danger/30 hover:bg-caixa-danger-soft hover:text-caixa-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-danger"
              >
                Apagar
              </button>
            )}
          </div>
        )}
      </div>

      {editando && (
        <EditarLoja loja={loja} aoFechar={() => setEditando(false)} />
      )}

      {confirmandoApagar && (
        <Consequencia
          nivel="perda"
          rotuloConfirmar={apagar.isPending ? "Apagando..." : "Apagar loja"}
          confirmando={apagar.isPending}
          aoCancelar={() => {
            apagar.reset();
            setConfirmandoApagar(false);
          }}
          aoConfirmar={() => apagar.mutate(loja.id)}
        >
          {apagar.isError ? (
            <>
              Não deu para apagar:{" "}
              {apagar.error instanceof Error
                ? apagar.error.message
                : "o servidor recusou."}
            </>
          ) : (
            <>
              Apagar <strong>{loja.nome_loja}</strong> de vez? Ela já está fora
              do painel e do formulário — apagar serve para sumir com uma loja
              cadastrada por engano, e não tem como desfazer. Se ela já lançou
              caixa alguma vez, o servidor não deixa: o histórico iria junto.
            </>
          )}
        </Consequencia>
      )}
    </li>
  );
}

/** Os dois regimes, com o que cada um significa no dia a dia da loja. */
const REGIMES = {
  1: {
    rotulo: "Um por dia",
    explicacao:
      "Cada loja lança um fechamento por dia, e o formulário não pergunta o turno.",
  },
  2: {
    rotulo: "Manhã e tarde",
    explicacao:
      "Cada loja lança dois fechamentos por dia: um de manhã, outro à tarde.",
  },
} as const;

/**
 * Trocar o regime muda o que o painel cobra de TODAS as lojas — some ou
 * aparece uma cobranca por loja por dia. Por isso o estado atual e escrito
 * por extenso e a troca passa por confirmacao: e o tipo de botao que se
 * aperta sem querer e so se descobre no dia seguinte, quando o painel comeca
 * a cobrar um lancamento que ninguem sabia que existia.
 *
 * Cartao proprio, e nao um rodape do codigo de acesso: as duas coisas nao tem
 * relacao nenhuma. Uma diz como o aparelho entra, a outra quantas vezes a
 * loja fecha o caixa — juntas, a segunda parecia detalhe da primeira.
 */
function FechamentosPorDia({
  aberta,
  aoAbrir,
  aoFechar,
}: {
  aberta: boolean;
  aoAbrir: () => void;
  aoFechar: () => void;
}) {
  const empresa = useMinhaEmpresa();
  const editar = useEditarEmpresa();

  const atual = empresa.data?.fechamentos_por_dia;
  if (!atual) {
    return null;
  }

  const outro = atual === 1 ? 2 : 1;

  return (
    <Secao
      titulo="Fechamentos por dia"
      descricao="Quantas vezes cada loja fecha o caixa."
    >
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="rounded-[8px] bg-caixa-accent-soft px-[14px] py-[7px] text-[15px] font-bold text-caixa-accent">
          {REGIMES[atual].rotulo}
        </span>
        <span className="text-[13px] font-medium uppercase tracking-[1px] text-caixa-muted">
          em uso agora
        </span>
      </div>

      <p className="text-[13px] leading-[1.45] text-caixa-muted">
        {REGIMES[atual].explicacao}
      </p>

      {aberta ? (
        <Consequencia
          nivel="atencao"
          rotuloConfirmar={
            editar.isPending
              ? "Mudando..."
              : `Mudar para ${REGIMES[outro].rotulo.toLowerCase()}`
          }
          confirmando={editar.isPending}
          aoCancelar={aoFechar}
          aoConfirmar={() =>
            editar.mutate({ fechamentos_por_dia: outro }, { onSuccess: aoFechar })
          }
        >
          Mudar para <strong>{REGIMES[outro].rotulo.toLowerCase()}</strong>?{" "}
          {REGIMES[outro].explicacao} Vale para <strong>todas as lojas</strong>,
          a partir de agora — os lançamentos já feitos continuam como estão.
        </Consequencia>
      ) : (
        <button
          type="button"
          onClick={aoAbrir}
          className="self-start rounded-[6px] text-[14px] font-medium text-caixa-muted underline-offset-4 transition hover:text-caixa-warn hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-warn"
        >
          Mudar para {REGIMES[outro].rotulo.toLowerCase()}
        </button>
      )}
    </Secao>
  );
}

/**
 * Quem toca a loja: lanca o caixa e pode ter consumo anotado.
 *
 * Mesma forma da secao de Lojas — lista com uma linha por pessoa, editar e
 * desativar em cada uma — porque a pergunta e a mesma: um cadastro que a
 * gerencia mantem. Ja foi uma fileira de etiquetas com um "x", que nao tinha
 * onde caber "editar" e escondia quem estava desativado.
 *
 * Fica antes de "quem pode retirar" porque e a ordem em que a loja preenche o
 * formulario — a primeira pergunta e quem esta lancando.
 *
 * Nao confundir com a secao de logins logo abaixo: esta gente nao entra no
 * painel, entra no formulario pelo codigo da empresa no aparelho.
 */
/**
 * Quem trabalha na loja, em duas secoes: gerente e funcionario.
 *
 * E um cadastro so no banco, com duas marcas — quem fecha o caixa, e quem
 * entra na lista de consumo. Separado na tela porque a empresa fala assim: sao
 * 60 pessoas e ~20 gerentes, e uma lista unica de 60 nomes nao responde
 * "quem pode fechar o caixa?" sem ler todas.
 *
 * As marcas se cruzam de proposito: gerente tambem come, entao ele fica na
 * secao dos gerentes e continua aparecendo no consumo.
 */
function Gerentes() {
  const encarregados = useEncarregados();
  const [criando, setCriando] = useState(false);
  const [recolhido, alternarRecolhido] = useRecolhido("gerentes");

  const lista = (encarregados.data ?? []).filter(
    (pessoa) => pessoa.pode_lancar_caixa,
  );
  const foraDoFormulario = lista.filter((pessoa) => !pessoa.ativo).length;

  return (
    <Secao
      titulo="Gerentes"
      descricao="Fecham o caixa: aparecem no formulário em quem está lançando."
      resumo={resumoDaLista(lista.length, "gerente", "gerentes", [
        foraDoFormulario > 0 ? `${foraDoFormulario} fora do formulário` : null,
      ])}
      // Cadastrar com a secao recolhida abriria um formulario invisivel.
      recolhido={recolhido && !criando}
      aoAlternarRecolhido={alternarRecolhido}
      acao={
        !criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="rounded-[10px] border border-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-caixa-accent transition hover:bg-caixa-accent-soft"
          >
            Adicionar gerente
          </button>
        )
      }
    >
      {criando && (
        <NovoEncarregado gerente aoFechar={() => setCriando(false)} />
      )}

      {encarregados.isPending ? (
        <p className="text-[14px] text-caixa-muted">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="max-w-[60ch] text-[14px] leading-[1.45] text-caixa-muted">
          Nenhum gerente. Sem pelo menos um aqui a loja não consegue lançar o
          caixa — o formulário pede que ela escolha quem está lançando.
        </p>
      ) : (
        <ul className="flex flex-col">
          {lista.map((pessoa) => (
            <LinhaDoEncarregado key={pessoa.id} pessoa={pessoa} />
          ))}
        </ul>
      )}
    </Secao>
  );
}

/** As outras pessoas da loja: nao fecham o caixa, mas consomem — e e a soma
 *  do mes delas que a gerência desconta. */
function Funcionarios() {
  const encarregados = useEncarregados();
  const [criando, setCriando] = useState(false);
  const [recolhido, alternarRecolhido] = useRecolhido("funcionarios");

  const lista = (encarregados.data ?? []).filter(
    (pessoa) => !pessoa.pode_lancar_caixa,
  );
  const semConsumo = lista.filter(
    (pessoa) => pessoa.ativo && !pessoa.pode_consumir,
  ).length;
  const foraDoFormulario = lista.filter((pessoa) => !pessoa.ativo).length;

  return (
    <Secao
      titulo="Funcionários"
      descricao="Não fecham o caixa. Aparecem na lista de consumo do formulário."
      resumo={resumoDaLista(lista.length, "funcionário", "funcionários", [
        semConsumo > 0 ? `${semConsumo} fora do consumo` : null,
        foraDoFormulario > 0 ? `${foraDoFormulario} fora do formulário` : null,
      ])}
      recolhido={recolhido && !criando}
      aoAlternarRecolhido={alternarRecolhido}
      acao={
        !criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="rounded-[10px] border border-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-caixa-accent transition hover:bg-caixa-accent-soft"
          >
            Adicionar funcionário
          </button>
        )
      }
    >
      {criando && <NovoEncarregado aoFechar={() => setCriando(false)} />}

      {encarregados.isPending ? (
        <p className="text-[14px] text-caixa-muted">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="max-w-[60ch] text-[14px] leading-[1.45] text-caixa-muted">
          Ninguém cadastrado. Quem estiver aqui aparece na lista de consumo do
          formulário, para o gerente lançar o que cada um consumiu.
        </p>
      ) : (
        <ul className="flex flex-col">
          {lista.map((pessoa) => (
            <LinhaDoEncarregado key={pessoa.id} pessoa={pessoa} />
          ))}
        </ul>
      )}
    </Secao>
  );
}

/** O cadastro de uma pessoa: so o nome. O papel vem da secao em que foi
 *  aberto — quem cadastra ja escolheu ao clicar. */
function NovoEncarregado({
  gerente = false,
  aoFechar,
}: {
  gerente?: boolean;
  aoFechar: () => void;
}) {
  const criar = useCriarEncarregado();
  const [nome, setNome] = useState("");

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        criar.mutate(
          { nome: nome.trim(), pode_lancar_caixa: gerente },
          { onSuccess: aoFechar },
        );
      }}
      className="flex flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[16px] py-[14px]"
    >
      <Campo
        rotulo="Nome completo"
        valor={nome}
        aoMudar={setNome}
        placeholder="José da Silva"
      />

      <p className="text-[13px] leading-[1.45] text-caixa-muted">
        {gerente
          ? "Ela não faz login: entra no formulário pelo código de acesso da empresa, no aparelho da loja, e é quem fecha o caixa."
          : "Ela não faz login. Vai aparecer na lista de consumo do formulário, para o gerente lançar o que ela consumiu."}
      </p>

      {criar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {criar.error instanceof Error
            ? criar.error.message
            : "Não foi possível adicionar."}
        </p>
      )}

      <div className="flex flex-wrap gap-[10px]">
        <button
          type="submit"
          disabled={criar.isPending || !nome.trim()}
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {criar.isPending ? "Salvando..." : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[10px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Uma pessoa na lista.
 *
 * Mesma forma da linha da loja, e a mesma regra: nao existe apagar, so
 * desativar. O nome dela esta carimbado em cada lancamento que ela ja fez —
 * apagar deixaria o historico dizendo "lancado por ninguem".
 */
function LinhaDoEncarregado({ pessoa }: { pessoa: EncarregadoNaTela }) {
  const desativar = useDesativarEncarregado();
  const reativar = useReativarEncarregado();
  const [editando, setEditando] = useState(false);

  const alternando = desativar.isPending || reativar.isPending;

  return (
    <li className="flex flex-col gap-[10px] border-t border-caixa-border py-[12px] first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <span className="flex flex-wrap items-center gap-[8px]">
          <span
            className={`text-[15px] font-medium ${
              pessoa.ativo ? "text-caixa-ink" : "text-caixa-muted"
            }`}
          >
            {pessoa.nome}
          </span>
          {!pessoa.ativo && (
            <span className="rounded-full border border-caixa-warn/30 bg-caixa-warn-soft px-[10px] py-[2px] text-[12px] font-semibold text-caixa-warn">
              fora do formulário
            </span>
          )}
          {/* So no ativo: quem ja saiu da empresa nao aparece em lista
              nenhuma, e as duas marcas juntas diriam duas ausencias. */}
          {pessoa.ativo && !pessoa.pode_consumir && (
            <span className="rounded-full border border-caixa-border px-[10px] py-[2px] text-[12px] font-medium text-caixa-muted">
              fora do consumo
            </span>
          )}
        </span>

        {!editando && (
          <div className="flex flex-wrap gap-[8px]">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-[10px] border border-caixa-border px-[14px] py-[8px] text-[13px] font-medium text-caixa-muted transition hover:border-caixa-accent/40 hover:bg-caixa-accent-soft hover:text-caixa-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
            >
              Editar
            </button>
            <button
              type="button"
              disabled={alternando}
              onClick={() =>
                pessoa.ativo
                  ? desativar.mutate(pessoa.id)
                  : reativar.mutate(pessoa.id)
              }
              className={`rounded-[10px] border px-[14px] py-[8px] text-[13px] font-medium transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                pessoa.ativo
                  ? "border-caixa-border text-caixa-muted hover:border-caixa-warn/45 hover:bg-caixa-warn-soft hover:text-caixa-warn focus-visible:outline-caixa-warn"
                  : "border-caixa-accent/40 text-caixa-accent hover:bg-caixa-accent-soft focus-visible:outline-caixa-accent"
              }`}
            >
              {pessoa.ativo ? "Desativar" : "Reativar"}
            </button>
          </div>
        )}
      </div>

      {editando && (
        <EditarEncarregado pessoa={pessoa} aoFechar={() => setEditando(false)} />
      )}
    </li>
  );
}

/** Corrigir o nome e os dois papeis. O nome dos lancamentos ja feitos nao
 *  muda: cada um guarda uma copia do nome de quando saiu. */
function EditarEncarregado({
  pessoa,
  aoFechar,
}: {
  pessoa: EncarregadoNaTela;
  aoFechar: () => void;
}) {
  const editar = useEditarEncarregado();
  const [nome, setNome] = useState(pessoa.nome);
  const [fechaCaixa, setFechaCaixa] = useState(pessoa.pode_lancar_caixa);
  const [consome, setConsome] = useState(pessoa.pode_consumir);

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        editar.mutate(
          {
            id: pessoa.id,
            nome: nome.trim(),
            pode_lancar_caixa: fechaCaixa,
            pode_consumir: consome,
          },
          { onSuccess: aoFechar },
        );
      }}
      className="flex flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[16px] py-[14px]"
    >
      <Campo rotulo="Nome completo" valor={nome} aoMudar={setNome} />

      <Marca
        rotulo="Fecha o caixa"
        ajuda={
          fechaCaixa
            ? "Aparece no formulário em quem está lançando. Desmarcar move a pessoa para Funcionários."
            : "Marcar move a pessoa para Gerentes, e o nome dela passa a aparecer em quem está lançando."
        }
        marcado={fechaCaixa}
        aoMudar={setFechaCaixa}
      />

      <Marca
        rotulo="Entra na lista de consumo"
        ajuda="O gerente escolhe o nome dela ao lançar o consumo do turno. Desmarcar não apaga o que já foi lançado."
        marcado={consome}
        aoMudar={setConsome}
      />

      {editar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {editar.error instanceof Error
            ? editar.error.message
            : "Não foi possível salvar."}
        </p>
      )}

      <div className="flex flex-wrap gap-[10px]">
        <button
          type="submit"
          disabled={editar.isPending || !nome.trim()}
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {editar.isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[10px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Uma marca de sim/nao com a consequencia escrita embaixo.
 *
 *  A frase muda conforme o estado: "o que acontece se eu mexer nisto" e a
 *  pergunta de quem esta com o dedo na caixinha, e ela nao tem resposta unica. */
function Marca({
  rotulo,
  ajuda,
  marcado,
  aoMudar,
}: {
  rotulo: string;
  ajuda: string;
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-[10px]">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(evento) => aoMudar(evento.target.checked)}
        className="mt-[3px] h-[16px] w-[16px] shrink-0 accent-caixa-accent"
      />
      <span className="flex flex-col gap-[2px]">
        <span className="text-[14px] font-medium leading-[1.35]">{rotulo}</span>
        <span className="max-w-[52ch] text-[13px] leading-[1.4] text-caixa-muted">
          {ajuda}
        </span>
      </span>
    </label>
  );
}

function Responsaveis() {
  const responsaveis = useResponsaveis();
  const criar = useCriarResponsavel();
  const desativar = useDesativarResponsavel();
  const [nome, setNome] = useState("");

  const ativos = (responsaveis.data ?? []).filter((pessoa) => pessoa.ativo);

  return (
    <Secao
      titulo="Quem pode retirar dinheiro"
      descricao="Aparece no formulário quando a loja marca uma retirada."
    >
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!nome.trim()) return;
          criar.mutate(nome.trim(), { onSuccess: () => setNome("") });
        }}
        className="flex flex-wrap gap-[10px]"
      >
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome de quem retira"
          maxLength={100}
          className="min-w-0 flex-1 rounded-[10px] border border-caixa-border bg-caixa-surface p-[12px] text-[15px] text-caixa-ink outline-none transition placeholder:text-caixa-muted focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15"
        />
        <button
          type="submit"
          disabled={criar.isPending || !nome.trim()}
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {criar.isPending ? "Salvando..." : "Adicionar"}
        </button>
      </form>

      {criar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {criar.error instanceof Error
            ? criar.error.message
            : "Não foi possível adicionar."}
        </p>
      )}

      {ativos.length === 0 ? (
        <p className="text-[14px] leading-[1.45] text-caixa-muted">
          Ninguém cadastrado. Sem isso, a loja não consegue registrar uma
          retirada — o formulário exige dizer quem levou o dinheiro.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-[8px]">
          {ativos.map((pessoa) => (
            <li
              key={pessoa.id}
              className="flex items-center gap-[8px] rounded-full border border-caixa-border bg-caixa-faixa py-[6px] pl-[14px] pr-[8px] text-[14px]"
            >
              {pessoa.nome}
              <button
                type="button"
                aria-label={`Remover ${pessoa.nome}`}
                title="Remover da lista (as retiradas antigas continuam com o nome dele)"
                disabled={desativar.isPending}
                onClick={() => desativar.mutate(pessoa.id)}
                className="flex h-[20px] w-[20px] items-center justify-center rounded-full text-[15px] leading-none text-caixa-muted transition hover:bg-caixa-danger-soft hover:text-caixa-danger disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

/** Um campo de texto do formulário — os três são iguais, e repetir a classe
 *  três vezes só faz a diferença entre eles ficar difícil de ver. */
function Campo({
  rotulo,
  tipo = "text",
  valor,
  aoMudar,
  placeholder,
  // Todo campo desta tela era obrigatorio ate o CNPJ chegar. Ele e o primeiro
  // que a loja pode nao ter em maos na hora do cadastro, e travar a criacao da
  // loja por causa disso trocaria um problema por outro pior.
  opcional = false,
  ajuda,
}: {
  rotulo: string;
  tipo?: string;
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string;
  opcional?: boolean;
  ajuda?: string;
}) {
  return (
    <label className="flex min-w-[180px] flex-1 flex-col gap-[5px]">
      <span className="text-[13px] font-medium text-caixa-muted">
        {rotulo}
        {opcional && (
          <span className="font-normal text-caixa-muted/70"> (opcional)</span>
        )}
      </span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        required={!opcional}
        className="w-full rounded-[10px] border border-caixa-border bg-caixa-surface p-[12px] text-[15px] text-caixa-ink outline-none transition placeholder:text-caixa-muted focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15"
      />
      {ajuda && (
        <span className="text-[12px] leading-[1.4] text-caixa-muted">{ajuda}</span>
      )}
    </label>
  );
}

function NovoAjudante({ aoFechar }: { aoFechar: () => void }) {
  const empresa = useMinhaEmpresa();
  const criar = useCriarFuncionario();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        criar.mutate(
          { nome: nome.trim(), email: email.trim(), senha },
          { onSuccess: aoFechar },
        );
      }}
      className="flex flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[16px] py-[14px]"
    >
      <div className="flex flex-wrap gap-[12px]">
        <Campo rotulo="Nome" valor={nome} aoMudar={setNome} placeholder="Ana" />
        <Campo
          rotulo="E-mail"
          tipo="email"
          valor={email}
          aoMudar={setEmail}
          placeholder="nome@empresa.com"
        />
        <Campo
          rotulo="Senha"
          tipo="password"
          valor={senha}
          aoMudar={setSenha}
          placeholder="mínimo 6 caracteres"
        />
      </div>

      <p className="text-[13px] leading-[1.45] text-caixa-muted">
        Entra com esse e-mail e essa senha, {empresa.data ? <>e passa a
        conferir o caixa <strong>da {empresa.data.nome}</strong></> : "e passa a conferir o caixa desta empresa"}
        {" "}— só dela. Combine a senha com ele; o sistema não a mostra de novo.
      </p>

      {criar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {criar.error instanceof Error
            ? criar.error.message
            : "Não foi possível criar o ajudante."}
        </p>
      )}

      <div className="flex flex-wrap gap-[10px]">
        <button
          type="submit"
          disabled={criar.isPending || !nome.trim() || !email.trim() || !senha}
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {criar.isPending ? "Criando..." : "Criar ajudante"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[10px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Uma pessoa na lista, e as duas saidas que ela tem.
 *
 * Desativar e Apagar nao podem parecer o mesmo botao, porque nao sao a mesma
 * coisa: uma volta atras, a outra nao. A cor e o unico jeito de ensinar isso
 * antes do clique — ocre em Desativar, tijolo em Apagar — e por isso nenhum
 * dos dois e cinza como o "Copiar" ali de cima.
 *
 * Quem esta sem acesso NAO fica riscado: riscado le como apagado, e desativar
 * e o contrario disso. O estado se le no pill ocre — a mesma cor da acao que
 * o colocou ali — e no nome em cinza. A barra na borda esquerda fica so para
 * as confirmacoes: se ela marcasse tambem um estado da linha, deixaria de
 * significar "isto aqui vai acontecer agora".
 */
function LinhaDoAjudante({ funcionario }: { funcionario: FuncionarioNaTela }) {
  const definirAtivo = useDefinirAtivoDoFuncionario();
  const apagar = useApagarFuncionario();
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  const nome = funcionario.nome || funcionario.email;

  return (
    <li className="flex flex-col gap-[10px] border-t border-caixa-border py-[12px] first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <span className="flex flex-col gap-[2px]">
          <span className="flex flex-wrap items-center gap-[8px]">
            <span
              className={`text-[15px] font-medium ${
                funcionario.ativo ? "text-caixa-ink" : "text-caixa-muted"
              }`}
            >
              {nome}
            </span>
            {!funcionario.ativo && (
              <span className="rounded-full border border-caixa-warn/30 bg-caixa-warn-soft px-[10px] py-[2px] text-[12px] font-semibold text-caixa-warn">
                sem acesso
              </span>
            )}
          </span>
          <span className="text-[13px] text-caixa-muted">{funcionario.email}</span>
        </span>

        {!confirmandoApagar && (
          <div className="flex flex-wrap gap-[8px]">
            <button
              type="button"
              disabled={definirAtivo.isPending}
              onClick={() =>
                definirAtivo.mutate({
                  id: funcionario.id,
                  ativo: !funcionario.ativo,
                })
              }
              className={`rounded-[10px] border px-[14px] py-[8px] text-[13px] font-medium transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                funcionario.ativo
                  ? "border-caixa-border text-caixa-muted hover:border-caixa-warn/45 hover:bg-caixa-warn-soft hover:text-caixa-warn focus-visible:outline-caixa-warn"
                  : "border-caixa-accent/40 text-caixa-accent hover:bg-caixa-accent-soft focus-visible:outline-caixa-accent"
              }`}
            >
              {funcionario.ativo ? "Desativar" : "Reativar"}
            </button>
            {/* Apagar so depois de desativar. Dois passos de proposito: quem
                tira alguem do ar no calor do momento resolve o problema com o
                primeiro, e so decide o segundo se ainda quiser. */}
            {!funcionario.ativo && (
              <button
                type="button"
                onClick={() => setConfirmandoApagar(true)}
                className="rounded-[10px] border border-transparent px-[12px] py-[8px] text-[13px] font-medium text-caixa-danger/85 transition hover:border-caixa-danger/30 hover:bg-caixa-danger-soft hover:text-caixa-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-danger"
              >
                Apagar
              </button>
            )}
          </div>
        )}
      </div>

      {confirmandoApagar && (
        <Consequencia
          nivel="perda"
          rotuloConfirmar={apagar.isPending ? "Apagando..." : "Apagar ajudante"}
          confirmando={apagar.isPending}
          aoCancelar={() => setConfirmandoApagar(false)}
          aoConfirmar={() => apagar.mutate(funcionario.id)}
        >
          Apagar <strong>{nome}</strong> de vez? Os turnos que ele conferiu
          continuam lá, mas passam a não ter mais o nome de quem conferiu — e
          isso não tem como desfazer.{" "}
          <strong>Desativar resolve na maioria dos casos</strong>: tira o acesso
          na hora e mantém o histórico inteiro.
        </Consequencia>
      )}
    </li>
  );
}

function Ajudantes() {
  const funcionarios = useFuncionarios();
  const [criando, setCriando] = useState(false);

  const lista = funcionarios.data ?? [];

  return (
    <Secao
      titulo="Ajudantes"
      descricao="Fazem login e ajudam a gerência a conferir o caixa. Não mexem nesta tela."
      acao={
        !criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="rounded-[10px] border border-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-caixa-accent transition hover:bg-caixa-accent-soft"
          >
            Criar ajudante
          </button>
        )
      }
    >
      {criando && <NovoAjudante aoFechar={() => setCriando(false)} />}

      {funcionarios.isPending ? (
        <p className="text-[14px] text-caixa-muted">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="max-w-[60ch] text-[14px] leading-[1.45] text-caixa-muted">
          Ninguém cadastrado. Um ajudante enxerga o painel, o por-loja, as
          saídas e os gráficos desta empresa, marca turnos como conferidos e
          corrige um valor errado — e não vê o código de acesso, os aparelhos,
          nem esta lista.
        </p>
      ) : (
        <ul className="flex flex-col">
          {lista.map((funcionario) => (
            <LinhaDoAjudante key={funcionario.id} funcionario={funcionario} />
          ))}
        </ul>
      )}
    </Secao>
  );
}
