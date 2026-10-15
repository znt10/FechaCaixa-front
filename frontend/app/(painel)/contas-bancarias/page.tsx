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
  mudancaDaConta,
  nomeDaConta,
  type RascunhoDaConta,
} from "@/features/banco/banco-da-tela";
import {
  useCategoriasDeMovimento,
  useContasBancarias,
  useCriarCategoriaDeMovimento,
  useCriarContaBancaria,
  useMudarCategoriaDeMovimento,
  useMudarContaBancaria,
} from "@/features/banco/hooks/useBanco";
import type {
  Banco,
  CategoriaDeMovimento,
  ContaBancaria,
} from "@/features/banco/services/banco";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";

const CLASSE_CAMPO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

const CLASSE_BOTAO =
  "rounded-[10px] bg-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60";

const CLASSE_BOTAO_LEVE =
  "rounded-[8px] border border-caixa-border px-[12px] py-[6px] text-[13px] font-semibold text-caixa-ink transition hover:border-caixa-accent/40 disabled:opacity-50";

const mensagem = (erro: unknown, padrao: string) =>
  erro instanceof Error ? erro.message : padrao;

/**
 * Contas bancárias e categorias do extrato.
 *
 * O cadastro que a tela do extrato precisa: de que loja é cada conta, e em
 * que categorias transferência e recebimento se separam. Pagamento não tem
 * categoria aqui — ele usa o plano de contas das notas fiscais, para o aluguel
 * pago no banco e o da nota caírem na mesma linha.
 *
 * Pagamento usa o plano de contas — os grupos e as categorias dentro deles —,
 * o mesmo das notas fiscais e dos comprovantes, e ele se mexe aqui também.
 *
 * Nada se apaga, só se desativa: o extrato importado pendura na conta e a
 * transação classificada pendura na categoria. Renomear pode: a linha já
 * classificada acompanha o nome novo.
 */
export default function ContasBancariasPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-[16px] md:px-[40px] pb-[60px]">
      <div className="flex flex-col gap-[2px] py-[28px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Contas e categorias</h1>
        <p className="text-[14px] leading-[1.4] text-caixa-muted">
          As contas de cada loja e como o extrato se separa.
        </p>
      </div>

      <div className="flex flex-col gap-[28px]">
        <ContasBancarias />
        <PlanoDeContas />
        <Categorias />
      </div>
    </main>
  );
}

function ContasBancarias() {
  const contas = useContasBancarias();
  const lojas = useLojasDoPainel();
  const criar = useCriarContaBancaria();
  const mudar = useMudarContaBancaria();
  // Uma conta em edição por vez: duas linhas abertas e um Salvar só deixariam
  // dúvida sobre qual delas foi gravada.
  const [editando, setEditando] = useState<string | null>(null);
  const [nova, setNova] = useState({
    loja_id: "",
    banco: "" as Banco | "",
    agencia: "",
    numero: "",
    apelido: "",
  });

  const pronta = nova.loja_id && nova.banco && nova.numero.trim();

  const salvar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!pronta || !nova.banco) return;
    criar.mutate(
      { ...nova, banco: nova.banco, numero: nova.numero.trim(), agencia: nova.agencia.trim() },
      { onSuccess: () => setNova({ loja_id: "", banco: "", agencia: "", numero: "", apelido: "" }) },
    );
  };

  return (
    <section className="flex flex-col gap-[14px]">
      <h2 className="text-[17px] font-semibold">Contas bancárias</h2>

      <div className="cartao-caixa overflow-hidden rounded-[12px] border border-caixa-border bg-caixa-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="h-[47px] bg-caixa-faixa text-[11px] font-semibold tracking-[0.5px] text-caixa-muted">
                <th className="pl-[24px] font-semibold">LOJA</th>
                <th className="font-semibold">CONTA</th>
                <th className="font-semibold">AGÊNCIA</th>
                <th className="font-semibold">NÚMERO</th>
                <th className="pr-[24px] text-right font-semibold">SITUAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {contas.isPending && (
                <tr className="h-[55px] border-t border-caixa-border">
                  <td colSpan={5} className="pl-[24px] text-[15px] text-caixa-muted">
                    Carregando contas...
                  </td>
                </tr>
              )}
              {contas.isSuccess && contas.data.length === 0 && (
                <tr className="border-t border-caixa-border">
                  <td colSpan={5} className="px-[24px] py-[18px] text-[15px] text-caixa-muted">
                    Nenhuma conta cadastrada. Cadastre abaixo a conta de cada loja.
                  </td>
                </tr>
              )}
              {(contas.data ?? []).map((conta) =>
                editando === conta.id ? (
                  <EdicaoDaConta key={conta.id} conta={conta} aoTerminar={() => setEditando(null)} />
                ) : (
                  <tr
                    key={conta.id}
                    className={`h-[55px] border-t border-caixa-border ${conta.ativo ? "" : "text-caixa-muted"}`}
                  >
                    <td className="pl-[24px] text-[15px]">{conta.loja.nome_loja}</td>
                    <td className="text-[15px]">{nomeDaConta(conta)}</td>
                    <td className="text-[15px] tabular-nums">{conta.agencia || "—"}</td>
                    <td className="text-[15px] tabular-nums">{conta.numero}</td>
                    <td className="whitespace-nowrap pr-[24px] text-right">
                      <span className="mr-[10px] text-[13px]">
                        {conta.ativo ? "Ativa" : "Desativada"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditando(conta.id)}
                        className={`${CLASSE_BOTAO_LEVE} mr-[6px]`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={mudar.isPending}
                        onClick={() =>
                          mudar.mutate({ id: conta.id, mudanca: { ativo: !conta.ativo } })
                        }
                        className={CLASSE_BOTAO_LEVE}
                      >
                        {conta.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mudar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(mudar.error, "Não foi possível mudar a conta.")}
        </p>
      )}

      <form
        onSubmit={salvar}
        className="flex flex-col gap-[12px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px]"
      >
        <h3 className="text-[15px] font-semibold">Nova conta</h3>
        <div className="grid gap-[12px] md:grid-cols-5">
          <select
            aria-label="Loja da conta"
            value={nova.loja_id}
            onChange={(evento) => setNova({ ...nova, loja_id: evento.target.value })}
            className={CLASSE_CAMPO}
          >
            <option value="">Loja</option>
            {(lojas.data ?? []).map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome_loja}
              </option>
            ))}
          </select>
          <select
            aria-label="Banco"
            value={nova.banco}
            onChange={(evento) => setNova({ ...nova, banco: evento.target.value as Banco })}
            className={CLASSE_CAMPO}
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
            placeholder="Agência (se tiver)"
            value={nova.agencia}
            onChange={(evento) => setNova({ ...nova, agencia: evento.target.value })}
            className={CLASSE_CAMPO}
          />
          <input
            aria-label="Número da conta"
            placeholder="Número com dígito"
            value={nova.numero}
            onChange={(evento) => setNova({ ...nova, numero: evento.target.value })}
            className={CLASSE_CAMPO}
          />
          <input
            aria-label="Apelido"
            placeholder="Apelido (opcional)"
            value={nova.apelido}
            onChange={(evento) => setNova({ ...nova, apelido: evento.target.value })}
            className={CLASSE_CAMPO}
          />
        </div>
        <div className="flex flex-wrap items-center gap-[12px]">
          <button type="submit" disabled={!pronta || criar.isPending} className={CLASSE_BOTAO}>
            {criar.isPending ? "Salvando..." : "Cadastrar conta"}
          </button>
          <span className="text-[13px] text-caixa-muted">
            O número é o que confere se o extrato subido é mesmo desta conta.
          </span>
        </div>
        {criar.error && (
          <p className="text-[14px] font-medium text-caixa-alerta">
            {mensagem(criar.error, "Não foi possível cadastrar a conta.")}
          </p>
        )}
      </form>
    </section>
  );
}

function Categorias() {
  const categorias = useCategoriasDeMovimento();
  const mudar = useMudarCategoriaDeMovimento();

  const doTipo = (tipo: CategoriaDeMovimento["tipo"]) =>
    (categorias.data ?? []).filter((categoria) => categoria.tipo === tipo);

  return (
    <section className="flex flex-col gap-[14px]">
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[17px] font-semibold">Categorias de transferência e recebimento</h2>
        <p className="text-[14px] text-caixa-muted">
          O que não é pagamento: dinheiro que mudou de conta e dinheiro que entrou.
        </p>
      </div>

      {categorias.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(categorias.error, "Não foi possível carregar as categorias.")}
        </p>
      )}

      <div className="grid gap-[16px] md:grid-cols-2">
        {(["TRANSFERENCIA", "RECEBIMENTO"] as const).map((tipo) => (
          <div
            key={tipo}
            className="flex flex-col gap-[10px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[16px]"
          >
            <h3 className="text-[15px] font-semibold">
              {tipo === "TRANSFERENCIA" ? "Transferência" : "Recebimento"}
            </h3>
            <ul className="flex flex-col gap-[6px]">
              {doTipo(tipo).map((categoria) => (
                <li
                  key={categoria.id}
                  className={`text-[15px] ${categoria.ativo ? "" : "text-caixa-muted"}`}
                >
                  <NomeEditavel
                    nome={categoria.nome}
                    rotulo="categoria"
                    salvando={mudar.isPending}
                    aoSalvar={(nome, pronto) =>
                      mudar.mutate({ id: categoria.id, mudanca: { nome } }, { onSuccess: pronto })
                    }
                    extra={
                      categoria.entre_lojas && (
                        <span className="ml-[6px] text-[12px] text-caixa-muted">
                          (o sistema usa sozinho)
                        </span>
                      )
                    }
                  >
                    {/* A de entre lojas não se desativa: é nela que o sistema
                        põe as duas pontas de uma transferência entre lojas. */}
                    {!categoria.entre_lojas && (
                      <button
                        type="button"
                        disabled={mudar.isPending}
                        onClick={() =>
                          mudar.mutate({ id: categoria.id, mudanca: { ativo: !categoria.ativo } })
                        }
                        className={CLASSE_BOTAO_LEVE}
                      >
                        {categoria.ativo ? "Desativar" : "Ativar"}
                      </button>
                    )}
                  </NomeEditavel>
                </li>
              ))}
            </ul>
            <NovaCategoria tipo={tipo} />
          </div>
        ))}
      </div>

      {mudar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(mudar.error, "Não foi possível mudar a categoria.")}
        </p>
      )}
    </section>
  );
}

function NovaCategoria({ tipo }: { tipo: CategoriaDeMovimento["tipo"] }) {
  const criar = useCriarCategoriaDeMovimento();
  const [nome, setNome] = useState("");

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!nome.trim()) return;
        criar.mutate({ tipo, nome: nome.trim() }, { onSuccess: () => setNome("") });
      }}
      className="flex flex-col gap-[6px]"
    >
      <div className="flex gap-[8px]">
        <input
          aria-label={`Nova categoria de ${tipo === "TRANSFERENCIA" ? "transferência" : "recebimento"}`}
          placeholder="Nova categoria"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          className={`${CLASSE_CAMPO} min-w-0 flex-1`}
        />
        <button type="submit" disabled={!nome.trim() || criar.isPending} className={CLASSE_BOTAO}>
          Adicionar
        </button>
      </div>
      {criar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(criar.error, "Não foi possível criar a categoria.")}
        </p>
      )}
    </form>
  );
}

/** A linha da conta virada formulário. A loja não muda: o servidor recusa,
 *  porque o extrato já importado é do CNPJ antigo. */
function EdicaoDaConta({ conta, aoTerminar }: { conta: ContaBancaria; aoTerminar: () => void }) {
  const mudar = useMudarContaBancaria();
  const [rascunho, setRascunho] = useState<RascunhoDaConta>({
    banco: conta.banco,
    agencia: conta.agencia,
    numero: conta.numero,
    apelido: conta.apelido,
  });
  const [erro, setErro] = useState<string | null>(null);

  const salvar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const { mudanca, erro: invalido } = mudancaDaConta(conta, rascunho);
    if (invalido) return setErro(invalido);
    if (!mudanca) return aoTerminar();
    setErro(null);
    mudar.mutate({ id: conta.id, mudanca }, { onSuccess: aoTerminar });
  };

  return (
    <tr className="border-t border-caixa-border bg-caixa-faixa/40">
      <td colSpan={5} className="px-[16px] py-[14px] md:px-[24px]">
        <form onSubmit={salvar} className="flex flex-col gap-[10px]">
          <div className="grid gap-[10px] md:grid-cols-[minmax(120px,1fr)_repeat(4,minmax(0,1fr))]">
            <span className="self-center text-[15px] font-medium">{conta.loja.nome_loja}</span>
            <select
              aria-label="Banco"
              value={rascunho.banco}
              onChange={(evento) => setRascunho({ ...rascunho, banco: evento.target.value as Banco })}
              className={CLASSE_CAMPO}
            >
              {BANCOS.map((banco) => (
                <option key={banco.valor} value={banco.valor}>
                  {banco.nome}
                </option>
              ))}
            </select>
            <input
              aria-label="Agência"
              placeholder="Agência (se tiver)"
              value={rascunho.agencia}
              onChange={(evento) => setRascunho({ ...rascunho, agencia: evento.target.value })}
              className={CLASSE_CAMPO}
            />
            <input
              aria-label="Número da conta"
              placeholder="Número com dígito"
              value={rascunho.numero}
              onChange={(evento) => setRascunho({ ...rascunho, numero: evento.target.value })}
              className={CLASSE_CAMPO}
              autoFocus
            />
            <input
              aria-label="Apelido"
              placeholder="Apelido (opcional)"
              value={rascunho.apelido}
              onChange={(evento) => setRascunho({ ...rascunho, apelido: evento.target.value })}
              className={CLASSE_CAMPO}
            />
          </div>
          <div className="flex flex-wrap items-center gap-[10px]">
            <button type="submit" disabled={mudar.isPending} className={CLASSE_BOTAO}>
              {mudar.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={aoTerminar} className={CLASSE_BOTAO_LEVE}>
              Cancelar
            </button>
            {(erro || mudar.error) && (
              <span className="text-[14px] font-medium text-caixa-alerta">
                {erro ?? mensagem(mudar.error, "Não foi possível salvar a conta.")}
              </span>
            )}
          </div>
        </form>
      </td>
    </tr>
  );
}

/**
 * O plano de contas: os grupos de pagamento e as categorias dentro deles.
 *
 * É o mesmo das notas fiscais e dos comprovantes — o aluguel pago no banco, o
 * da nota e o do comprovante caem na mesma linha.
 */
function PlanoDeContas() {
  const grupos = useGruposDeDespesa();
  const criarGrupo = useCriarGrupoDeDespesa();
  const [nomeDoGrupo, setNomeDoGrupo] = useState("");

  return (
    <section className="flex flex-col gap-[14px]">
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[17px] font-semibold">Categorias de pagamento</h2>
        <p className="text-[14px] text-caixa-muted">
          Os grupos e as categorias dentro deles. São os mesmos das notas fiscais e dos
          comprovantes.
        </p>
      </div>

      {grupos.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(grupos.error, "Não foi possível carregar os grupos.")}
        </p>
      )}

      <div className="grid gap-[16px] md:grid-cols-2 xl:grid-cols-3">
        {(grupos.data ?? []).map((grupo) => (
          <GrupoDoPlano key={grupo.id} grupo={grupo} />
        ))}
      </div>

      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!nomeDoGrupo.trim()) return;
          criarGrupo.mutate(nomeDoGrupo.trim(), { onSuccess: () => setNomeDoGrupo("") });
        }}
        className="flex flex-col gap-[8px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[16px] md:px-[24px]"
      >
        <h3 className="text-[15px] font-semibold">Novo grupo</h3>
        <div className="flex flex-wrap gap-[8px]">
          <input
            aria-label="Nome do novo grupo"
            placeholder="Ex.: Manutenção"
            value={nomeDoGrupo}
            onChange={(evento) => setNomeDoGrupo(evento.target.value)}
            className={`${CLASSE_CAMPO} min-w-[200px] flex-1`}
          />
          <button
            type="submit"
            disabled={!nomeDoGrupo.trim() || criarGrupo.isPending}
            className={CLASSE_BOTAO}
          >
            {criarGrupo.isPending ? "Criando..." : "Criar grupo"}
          </button>
        </div>
        <span className="text-[13px] text-caixa-muted">
          Depois de criado, adicione as categorias dentro dele no cartão do grupo.
        </span>
        {criarGrupo.error && (
          <p className="text-[14px] font-medium text-caixa-alerta">
            {mensagem(criarGrupo.error, "Não foi possível criar o grupo.")}
          </p>
        )}
      </form>
    </section>
  );
}

function GrupoDoPlano({
  grupo,
}: {
  grupo: { id: string; nome: string; ativo: boolean; elementos: { id: string; nome: string; ativo: boolean }[] };
}) {
  const mudarGrupo = useMudarGrupoDeDespesa();
  const mudarElemento = useMudarElementoDeDespesa();
  const criarElemento = useCriarElementoDeDespesa();
  const [nova, setNova] = useState("");
  const erro = mudarGrupo.error ?? mudarElemento.error ?? criarElemento.error;

  return (
    <div
      className={`flex flex-col gap-[10px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[16px] ${
        grupo.ativo ? "" : "opacity-70"
      }`}
    >
      <NomeEditavel
        nome={grupo.nome}
        rotulo="grupo"
        destaque
        salvando={mudarGrupo.isPending}
        aoSalvar={(nome, pronto) =>
          mudarGrupo.mutate({ id: grupo.id, mudanca: { nome } }, { onSuccess: pronto })
        }
        extra={!grupo.ativo && <span className="ml-[6px] text-[12px] text-caixa-muted">(desativado)</span>}
      >
        <button
          type="button"
          disabled={mudarGrupo.isPending}
          onClick={() => mudarGrupo.mutate({ id: grupo.id, mudanca: { ativo: !grupo.ativo } })}
          className={CLASSE_BOTAO_LEVE}
        >
          {grupo.ativo ? "Desativar" : "Ativar"}
        </button>
      </NomeEditavel>

      {/* O fio da esquerda é o mesmo da árvore do extrato: o que está aqui
          dentro é do grupo de cima. */}
      <ul className="ml-[4px] flex flex-col gap-[6px] border-l border-caixa-border pl-[12px]">
        {grupo.elementos.length === 0 && (
          <li className="text-[14px] text-caixa-muted">Nenhuma categoria ainda.</li>
        )}
        {grupo.elementos.map((elemento) => (
          <li
            key={elemento.id}
            className={`text-[15px] ${elemento.ativo ? "" : "text-caixa-muted"}`}
          >
            <NomeEditavel
              nome={elemento.nome}
              rotulo="categoria"
              salvando={mudarElemento.isPending}
              aoSalvar={(nome, pronto) =>
                mudarElemento.mutate({ id: elemento.id, mudanca: { nome } }, { onSuccess: pronto })
              }
            >
              <button
                type="button"
                disabled={mudarElemento.isPending}
                onClick={() =>
                  mudarElemento.mutate({ id: elemento.id, mudanca: { ativo: !elemento.ativo } })
                }
                className={CLASSE_BOTAO_LEVE}
              >
                {elemento.ativo ? "Desativar" : "Ativar"}
              </button>
            </NomeEditavel>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!nova.trim()) return;
          criarElemento.mutate(
            { grupoId: grupo.id, nome: nova.trim() },
            { onSuccess: () => setNova("") },
          );
        }}
        className="flex gap-[8px]"
      >
        <input
          aria-label={`Nova categoria em ${grupo.nome}`}
          placeholder="Nova categoria neste grupo"
          value={nova}
          onChange={(evento) => setNova(evento.target.value)}
          className={`${CLASSE_CAMPO} min-w-0 flex-1`}
        />
        <button
          type="submit"
          disabled={!nova.trim() || criarElemento.isPending}
          className={CLASSE_BOTAO}
        >
          Adicionar
        </button>
      </form>

      {erro && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {mensagem(erro, "Não foi possível salvar.")}
        </p>
      )}
    </div>
  );
}

/**
 * Um nome com "Renomear" ao lado, que vira campo no lugar.
 *
 * Enter salva, Esc desiste. Os botões do resto da linha (Desativar) vêm como
 * filhos e somem durante a edição, para a linha não ter dois "salvar".
 */
function NomeEditavel({
  nome,
  rotulo,
  salvando,
  aoSalvar,
  extra,
  destaque = false,
  children,
}: {
  nome: string;
  rotulo: string;
  salvando: boolean;
  aoSalvar: (nome: string, pronto: () => void) => void;
  extra?: React.ReactNode;
  destaque?: boolean;
  children?: React.ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(nome);

  const abrir = () => {
    setRascunho(nome);
    setEditando(true);
  };

  if (editando) {
    return (
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          const limpo = rascunho.trim();
          if (!limpo || limpo === nome) return setEditando(false);
          aoSalvar(limpo, () => setEditando(false));
        }}
        className="flex items-center gap-[8px]"
      >
        <input
          aria-label={`Novo nome da ${rotulo}`}
          value={rascunho}
          onChange={(evento) => setRascunho(evento.target.value)}
          onKeyDown={(evento) => evento.key === "Escape" && setEditando(false)}
          className={`${CLASSE_CAMPO} min-w-0 flex-1`}
          autoFocus
        />
        <button type="submit" disabled={salvando} className={CLASSE_BOTAO_LEVE}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setEditando(false)} className={CLASSE_BOTAO_LEVE}>
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-[10px]">
      <span className={destaque ? "text-[15px] font-semibold" : ""}>
        {nome}
        {extra}
      </span>
      <span className="flex shrink-0 gap-[6px]">
        <button type="button" onClick={abrir} className={CLASSE_BOTAO_LEVE}>
          Renomear
        </button>
        {children}
      </span>
    </div>
  );
}
