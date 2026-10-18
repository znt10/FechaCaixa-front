"use client";

import { useState } from "react";

import {
  useCriarElementoDeDespesa,
  useCriarGrupoDeDespesa,
  useGruposDeDespesa,
  useMudarElementoDeDespesa,
  useMudarGrupoDeDespesa,
} from "@/features/admin/hooks/useNotas";
import {
  BANCOS,
  coberturaDasLojas,
  contasPorLoja,
  mudancaDaConta,
  type RascunhoDaConta,
} from "@/features/banco/banco-da-tela";
import { origemDaConta } from "@/features/pluggy/situacao-da-pluggy";
import { CartaoDeCategorias } from "@/features/banco/components/CartaoDeCategorias";
import {
  useCategoriasDeMovimento,
  useContasBancarias,
  useCriarCategoriaDeMovimento,
  useCriarContaBancaria,
  useMudarCategoriaDeMovimento,
  useMudarContaBancaria,
} from "@/features/banco/hooks/useBanco";
import type { Banco, ContaBancaria } from "@/features/banco/services/banco";
import { CartaoDeConfiguracao } from "@/features/comprovantes/components/CartaoDeConfiguracao";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";

const CLASSE_CAMPO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

const CLASSE_BOTAO =
  "rounded-[10px] bg-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60";

const CLASSE_LINK =
  "rounded-[6px] px-[4px] text-[13px] font-semibold text-caixa-accent transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent disabled:opacity-50";

const CLASSE_LINK_QUIETO =
  "rounded-[6px] px-[4px] text-[13px] font-medium text-caixa-muted transition hover:text-caixa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent disabled:opacity-50";

const mensagem = (erro: unknown, padrao: string) =>
  erro ? (erro instanceof Error ? erro.message : padrao) : null;

/**
 * Contas bancárias e categorias do extrato.
 *
 * O cadastro que a tela do extrato precisa: de que loja é cada conta, e em
 * que categorias o dinheiro se separa. Pagamento usa o plano de contas — os
 * grupos e as categorias dentro deles —, o mesmo das notas fiscais e dos
 * comprovantes.
 *
 * Nada se apaga, só se desativa: o extrato importado pendura na conta e a
 * transação classificada pendura na categoria. Renomear pode: a linha já
 * classificada acompanha o nome novo.
 */
export default function ContasBancariasPage() {
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-[24px] px-[16px] pb-[60px] pt-[28px] md:px-[40px]">
      <div className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Contas e categorias</h1>
        <p className="text-[14px] leading-[1.4] text-caixa-muted">
          A conta de cada loja e em que o dinheiro do extrato se separa.
        </p>
      </div>

      <ContasBancarias />
      <PlanoDeContas />
      <TransferenciaERecebimento />
    </main>
  );
}

/** Qual formulário está aberto: a conta nova de uma loja, ou a edição de uma
 *  conta. Um por vez — dois abertos e um Salvar deixariam dúvida. */
type Aberto = { lojaId: string; contaId: string | null } | null;

function ContasBancarias() {
  const contas = useContasBancarias();
  const lojas = useLojasDoPainel();
  const mudar = useMudarContaBancaria();
  const [aberto, setAberto] = useState<Aberto>(null);

  const linhas = contasPorLoja(lojas.data ?? [], contas.data ?? []);
  const cobertura = coberturaDasLojas(linhas);

  return (
    <CartaoDeConfiguracao
      titulo="Contas bancárias"
      descricao="O extrato só reconhece a transferência entre duas lojas quando a conta das duas está aqui. O número confere se o arquivo subido é mesmo da conta escolhida."
      aoLado={
        linhas.length > 0 && (
          <div className="flex w-full flex-col gap-[8px] md:w-[260px]">
            <span className="text-[13px] font-medium">{cobertura.texto}</span>
            {/* Um traço por loja, como o "lojas fecharam" do fechamento: dá
                para ver de longe quantas faltam, sem ler. */}
            <div className="flex gap-[4px]">
              {linhas.map(({ loja, contas: daLoja }) => (
                <span
                  key={loja.id}
                  title={loja.nome_loja}
                  className={`h-[6px] flex-1 rounded-full ${
                    daLoja.some((conta) => conta.ativo) ? "bg-caixa-accent" : "bg-caixa-accent/20"
                  }`}
                />
              ))}
            </div>
          </div>
        )
      }
    >
      {(contas.isPending || lojas.isPending) && (
        <p className="text-[14px] text-caixa-muted">Carregando contas...</p>
      )}

      <ul className="flex flex-col divide-y divide-caixa-border">
        {linhas.map(({ loja, contas: daLoja }) => {
          const novaAberta = aberto?.lojaId === loja.id && aberto.contaId === null;
          return (
            <li
              key={loja.id}
              className="grid gap-x-[20px] gap-y-[8px] py-[14px] first:pt-0 last:pb-0 md:grid-cols-[180px_1fr]"
            >
              <span className="pt-[2px] text-[15px] font-semibold">{loja.nome_loja}</span>

              <div className="flex flex-col gap-[8px]">
                {daLoja.length === 0 && !novaAberta && (
                  <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px]">
                    <span className="text-[14px] text-caixa-muted">Sem conta cadastrada</span>
                    <button
                      type="button"
                      onClick={() => setAberto({ lojaId: loja.id, contaId: null })}
                      className={CLASSE_LINK}
                    >
                      Cadastrar conta
                    </button>
                  </div>
                )}

                {daLoja.map((conta) =>
                  aberto?.contaId === conta.id ? (
                    <FormularioDeConta
                      key={conta.id}
                      lojaId={loja.id}
                      conta={conta}
                      aoTerminar={() => setAberto(null)}
                    />
                  ) : (
                    <div
                      key={conta.id}
                      className={`flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px] text-[14px] ${
                        conta.ativo ? "" : "text-caixa-muted"
                      }`}
                    >
                      <span className="font-medium">{conta.banco_nome}</span>
                      <span className="tabular-nums">
                        {conta.agencia && `ag. ${conta.agencia}  `}
                        {conta.numero}
                      </span>
                      {conta.apelido && <span className="text-caixa-muted">“{conta.apelido}”</span>}
                      <span className="text-[12px] text-caixa-muted">{origemDaConta(conta, new Date())}</span>
                      {!conta.ativo && <span className="text-[12px]">desativada</span>}
                      <span className="ml-auto flex gap-[6px]">
                        <button
                          type="button"
                          onClick={() => setAberto({ lojaId: loja.id, contaId: conta.id })}
                          className={CLASSE_LINK}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={mudar.isPending}
                          onClick={() =>
                            mudar.mutate({ id: conta.id, mudanca: { ativo: !conta.ativo } })
                          }
                          className={CLASSE_LINK_QUIETO}
                        >
                          {conta.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </span>
                    </div>
                  ),
                )}

                {novaAberta ? (
                  <FormularioDeConta lojaId={loja.id} aoTerminar={() => setAberto(null)} />
                ) : (
                  daLoja.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAberto({ lojaId: loja.id, contaId: null })}
                      className={`${CLASSE_LINK_QUIETO} self-start`}
                    >
                      Outra conta nesta loja
                    </button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {mudar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(mudar.error, "Não foi possível mudar a conta.")}
        </p>
      )}
    </CartaoDeConfiguracao>
  );
}

/**
 * Cadastrar ou editar uma conta, na própria linha da loja.
 *
 * A loja não é campo: ela é a linha onde o formulário abriu. Na edição ela
 * também não muda — o servidor recusa, porque o extrato já importado é do CNPJ
 * antigo.
 */
function FormularioDeConta({
  lojaId,
  conta,
  aoTerminar,
}: {
  lojaId: string;
  conta?: ContaBancaria;
  aoTerminar: () => void;
}) {
  const criar = useCriarContaBancaria();
  const mudar = useMudarContaBancaria();
  const [rascunho, setRascunho] = useState<Omit<RascunhoDaConta, "banco"> & { banco: Banco | "" }>({
    banco: conta?.banco ?? "",
    agencia: conta?.agencia ?? "",
    numero: conta?.numero ?? "",
    apelido: conta?.apelido ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const salvando = criar.isPending || mudar.isPending;

  const salvar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!rascunho.banco) return setErro("Escolha o banco.");
    const preenchido = { ...rascunho, banco: rascunho.banco };
    setErro(null);

    if (!conta) {
      if (!preenchido.numero.trim()) return setErro("O número da conta não pode ficar vazio.");
      return criar.mutate(
        {
          loja_id: lojaId,
          banco: preenchido.banco,
          agencia: preenchido.agencia.trim(),
          numero: preenchido.numero.trim(),
          apelido: preenchido.apelido.trim(),
        },
        { onSuccess: aoTerminar },
      );
    }

    const { mudanca, erro: invalido } = mudancaDaConta(conta, preenchido);
    if (invalido) return setErro(invalido);
    if (!mudanca) return aoTerminar();
    mudar.mutate({ id: conta.id, mudanca }, { onSuccess: aoTerminar });
  };

  const falha =
    erro ??
    mensagem(criar.error, "Não foi possível cadastrar a conta.") ??
    mensagem(mudar.error, "Não foi possível salvar a conta.");

  return (
    <form
      onSubmit={salvar}
      className="flex flex-col gap-[10px] rounded-[10px] border border-caixa-accent/40 bg-caixa-faixa/50 p-[12px]"
    >
      <div className="grid gap-[8px] sm:grid-cols-2 lg:grid-cols-4">
        <select
          aria-label="Banco"
          value={rascunho.banco}
          onChange={(evento) => setRascunho({ ...rascunho, banco: evento.target.value as Banco })}
          className={CLASSE_CAMPO}
          autoFocus={!conta}
        >
          <option value="">Banco</option>
          {BANCOS.map((banco) => (
            <option key={banco.valor} value={banco.valor}>
              {banco.nome}
            </option>
          ))}
        </select>
        <input
          aria-label="Agência"
          placeholder="Agência, se tiver"
          value={rascunho.agencia}
          onChange={(evento) => setRascunho({ ...rascunho, agencia: evento.target.value })}
          className={CLASSE_CAMPO}
        />
        <input
          aria-label="Número da conta"
          placeholder="Número com o dígito"
          value={rascunho.numero}
          onChange={(evento) => setRascunho({ ...rascunho, numero: evento.target.value })}
          className={CLASSE_CAMPO}
          autoFocus={Boolean(conta)}
        />
        <input
          aria-label="Apelido"
          placeholder="Apelido, se quiser"
          value={rascunho.apelido}
          onChange={(evento) => setRascunho({ ...rascunho, apelido: evento.target.value })}
          className={CLASSE_CAMPO}
        />
      </div>
      <div className="flex flex-wrap items-center gap-[12px]">
        <button type="submit" disabled={salvando} className={CLASSE_BOTAO}>
          {salvando ? "Salvando..." : conta ? "Salvar conta" : "Cadastrar conta"}
        </button>
        <button type="button" onClick={aoTerminar} className={CLASSE_LINK_QUIETO}>
          Cancelar
        </button>
        {falha && <span className="text-[14px] font-medium text-caixa-alerta">{falha}</span>}
      </div>
    </form>
  );
}

/**
 * O plano de contas: os grupos de pagamento e as categorias dentro deles. O
 * aluguel pago no banco, o da nota e o do comprovante caem na mesma linha.
 */
function PlanoDeContas() {
  const grupos = useGruposDeDespesa();
  const mudarGrupo = useMudarGrupoDeDespesa();
  const mudarElemento = useMudarElementoDeDespesa();
  const criarElemento = useCriarElementoDeDespesa();

  const salvando = mudarGrupo.isPending || mudarElemento.isPending || criarElemento.isPending;

  const grupoDoElemento = (elementoId?: string) =>
    grupos.data?.find((grupo) => grupo.elementos.some((elemento) => elemento.id === elementoId))
      ?.id;

  // O erro aparece no cartão que o causou, e não em todos.
  const erroDo = (grupoId: string) => {
    const falhou = [
      { erro: mudarGrupo.error, id: mudarGrupo.variables?.id },
      { erro: mudarElemento.error, id: grupoDoElemento(mudarElemento.variables?.id) },
      { erro: criarElemento.error, id: criarElemento.variables?.grupoId },
    ].find((tentativa) => tentativa.erro && tentativa.id === grupoId);
    return falhou ? mensagem(falhou.erro, "Não foi possível salvar.") : null;
  };

  return (
    <CartaoDeConfiguracao
      titulo="Categorias de pagamento"
      descricao="Os grupos e as categorias dentro deles. São os mesmos das notas fiscais e dos comprovantes."
    >
      {grupos.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(grupos.error, "Não foi possível carregar os grupos.")}
        </p>
      )}

      <div className="grid gap-[14px] md:grid-cols-2 xl:grid-cols-3">
        {(grupos.data ?? []).map((grupo) => (
          <CartaoDeCategorias
            key={grupo.id}
            titulo={grupo.nome}
            ativo={grupo.ativo}
            itens={grupo.elementos}
            salvando={salvando}
            erro={erroDo(grupo.id)}
            aoRenomearTitulo={(nome) => mudarGrupo.mutate({ id: grupo.id, mudanca: { nome } })}
            aoAtivarTitulo={(ativo) => mudarGrupo.mutate({ id: grupo.id, mudanca: { ativo } })}
            aoRenomearItem={(id, nome) => mudarElemento.mutate({ id, mudanca: { nome } })}
            aoAtivarItem={(id, ativo) => mudarElemento.mutate({ id, mudanca: { ativo } })}
            aoCriarItem={(nome, pronto) =>
              criarElemento.mutate({ grupoId: grupo.id, nome }, { onSuccess: pronto })
            }
          />
        ))}
        <NovoGrupo />
      </div>
    </CartaoDeConfiguracao>
  );
}

/** O grupo novo nasce no lugar onde vai ficar: o último cartão da grade. */
function NovoGrupo() {
  const criar = useCriarGrupoDeDespesa();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-[120px] items-center justify-center rounded-[12px] border border-dashed border-caixa-border text-[14px] font-semibold text-caixa-accent transition hover:border-caixa-accent/50 hover:bg-caixa-accent-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
      >
        Novo grupo
      </button>
    );
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        const limpo = nome.trim();
        if (!limpo) return;
        criar.mutate(limpo, {
          onSuccess: () => {
            setNome("");
            setAberto(false);
          },
        });
      }}
      className="flex min-h-[120px] flex-col justify-center gap-[10px] rounded-[12px] border border-dashed border-caixa-accent/50 px-[18px] py-[14px]"
    >
      <input
        aria-label="Nome do novo grupo"
        placeholder="Nome do grupo, como Manutenção"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        onKeyDown={(evento) => evento.key === "Escape" && setAberto(false)}
        className={CLASSE_CAMPO}
        autoFocus
      />
      <div className="flex items-center gap-[12px]">
        <button type="submit" disabled={!nome.trim() || criar.isPending} className={CLASSE_BOTAO}>
          {criar.isPending ? "Criando..." : "Criar grupo"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className={CLASSE_LINK_QUIETO}>
          Cancelar
        </button>
      </div>
      {criar.error && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {mensagem(criar.error, "Não foi possível criar o grupo.")}
        </p>
      )}
    </form>
  );
}

function TransferenciaERecebimento() {
  const categorias = useCategoriasDeMovimento();
  const mudar = useMudarCategoriaDeMovimento();
  const criar = useCriarCategoriaDeMovimento();

  return (
    <CartaoDeConfiguracao
      titulo="Transferência e recebimento"
      descricao="O que não é pagamento: dinheiro que só mudou de conta, e dinheiro que entrou."
    >
      {categorias.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(categorias.error, "Não foi possível carregar as categorias.")}
        </p>
      )}

      <div className="grid gap-[14px] md:grid-cols-2">
        {(["TRANSFERENCIA", "RECEBIMENTO"] as const).map((tipo) => {
          const doTipo = (categorias.data ?? []).filter((categoria) => categoria.tipo === tipo);
          const daqui = (id?: string) => doTipo.some((categoria) => categoria.id === id);
          return (
            <CartaoDeCategorias
              key={tipo}
              titulo={tipo === "TRANSFERENCIA" ? "Transferência" : "Recebimento"}
              itens={doTipo.map((categoria) => ({
                ...categoria,
                // A de entre lojas não se desativa: é nela que o sistema põe
                // as duas pontas de uma transferência entre lojas.
                fixo: categoria.entre_lojas ? "o sistema usa sozinho" : undefined,
              }))}
              salvando={mudar.isPending || criar.isPending}
              erro={
                (daqui(mudar.variables?.id)
                  ? mensagem(mudar.error, "Não foi possível salvar.")
                  : null) ??
                (criar.variables?.tipo === tipo
                  ? mensagem(criar.error, "Não foi possível criar a categoria.")
                  : null)
              }
              aoRenomearItem={(id, nome) => mudar.mutate({ id, mudanca: { nome } })}
              aoAtivarItem={(id, ativo) => mudar.mutate({ id, mudanca: { ativo } })}
              aoCriarItem={(nome, pronto) => criar.mutate({ tipo, nome }, { onSuccess: pronto })}
            />
          );
        })}
      </div>
    </CartaoDeConfiguracao>
  );
}
