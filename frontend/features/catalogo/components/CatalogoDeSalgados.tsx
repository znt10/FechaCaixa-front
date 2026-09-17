"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Salgado } from "@/features/fechamento/services/fechamentos";
import {
  atualizarCategoria,
  atualizarSalgado,
  criarCategoria,
  criarSalgado,
  getCategorias,
  getSalgadosDoPainel,
  type CategoriaDeSalgado,
} from "@/features/catalogo/services/catalogo";

const CHAVE_CATALOGO = ["catalogo"] as const;

function useCategorias() {
  return useQuery({
    queryKey: [...CHAVE_CATALOGO, "categorias"],
    queryFn: getCategorias,
  });
}

function useSalgados() {
  return useQuery({
    queryKey: [...CHAVE_CATALOGO, "salgados"],
    queryFn: getSalgadosDoPainel,
  });
}

/** Toda mutacao desta tela mexe em categoria e/ou item — invalidar as duas
 *  listas juntas evita o caso de criar um item e ve-lo faltando ate a
 *  categoria revalidar por conta propria. */
function useInvalidarCatalogo() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: CHAVE_CATALOGO });
}

function useCriarCategoria() {
  const invalidar = useInvalidarCatalogo();
  return useMutation({
    mutationFn: (nome: string) => criarCategoria(nome),
    onSuccess: invalidar,
  });
}

function useCriarSalgado() {
  const invalidar = useInvalidarCatalogo();
  return useMutation({
    mutationFn: ({ nome, categoria }: { nome: string; categoria: string }) =>
      criarSalgado(nome, categoria),
    onSuccess: invalidar,
  });
}

function useAtualizarCategoria() {
  const invalidar = useInvalidarCatalogo();
  return useMutation({
    mutationFn: ({
      id,
      campos,
    }: {
      id: string;
      campos: Partial<Pick<CategoriaDeSalgado, "nome" | "ativo" | "ordem">>;
    }) => atualizarCategoria(id, campos),
    onSuccess: invalidar,
  });
}

function useAtualizarSalgado() {
  const invalidar = useInvalidarCatalogo();
  return useMutation({
    mutationFn: ({
      id,
      campos,
    }: {
      id: string;
      campos: Partial<Pick<Salgado, "nome" | "ativo" | "categoria">>;
    }) => atualizarSalgado(id, campos),
    onSuccess: invalidar,
  });
}

/** O que a lista diz de si em uma linha: quantidade e o que vale a pena
 *  destacar (por exemplo, quantos estao fora do formulario). */
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

/**
 * A tela do catalogo de salgados — do gerente.
 *
 * O catalogo e semeado sozinho na primeira listagem (6 categorias, 42 itens),
 * entao esta tela nunca abre vazia numa conta nova: ela existe para corrigir
 * nome, criar o que falta e tirar do ar o que nao se usa mais, nao para
 * povoar do zero.
 *
 * Nao existe apagar aqui — nem para categoria, nem para item. O item guarda
 * historico de desperdicio (PROTECT no backend), e uma categoria pode ter
 * itens historicos mesmo desativada. Desativar e a unica saida, e ela nao
 * apaga nada: so tira a categoria ou o item do formulario da loja.
 */
export function CatalogoDeSalgados() {
  const categorias = useCategorias();
  const salgados = useSalgados();
  const [criandoCategoria, setCriandoCategoria] = useState(false);

  const categoriasOrdenadas = useMemo(
    () =>
      [...(categorias.data ?? [])].sort(
        (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"),
      ),
    [categorias.data],
  );

  const itensPorCategoria = useMemo(() => {
    const mapa = new Map<string, Salgado[]>();
    for (const item of salgados.data ?? []) {
      const lista = mapa.get(item.categoria) ?? [];
      lista.push(item);
      mapa.set(item.categoria, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }
    return mapa;
  }, [salgados.data]);

  const carregandoCategorias = categorias.isPending;
  const carregandoItens = salgados.isPending;
  const erroCategorias = categorias.error;
  const erroItens = salgados.error;

  // As duas listas vem de dois endpoints independentes: um falhar nao pode
  // apagar o que o outro entregou. Sem categoria nao ha o que desenhar (nada
  // para agrupar os itens), entao so a falta DELA bloqueia a tela inteira; a
  // falta dos itens vira aviso dentro da secao, com as categorias continuando
  // utilizaveis.
  const totalItensRecebidos = (salgados.data ?? []).length;
  const totalItensAgrupados = useMemo(
    () =>
      Array.from(itensPorCategoria.values()).reduce(
        (soma, lista) => soma + lista.length,
        0,
      ),
    [itensPorCategoria],
  );
  // Nao deveria acontecer — os dois endpoints sao escopados na mesma conta —
  // mas um item com uma `categoria` que nao esta na lista carregada some
  // calado do agrupamento por categoria. Esta conta denuncia o sumiço em vez
  // de deixar a soma bater sozinha.
  const itensOrfaos = totalItensRecebidos - totalItensAgrupados;

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-[20px] px-[16px] md:px-[40px] pb-[60px] pt-[28px]">
      <div className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Catálogo de salgados</h1>
        <p className="max-w-[70ch] text-[14px] leading-[1.4] text-caixa-muted">
          As categorias e os itens que aparecem no formulário da loja, para
          consumo e desperdício.
        </p>
      </div>

      {erroCategorias && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          Não foi possível carregar as categorias:{" "}
          {erroCategorias instanceof Error
            ? erroCategorias.message
            : "erro desconhecido."}
        </p>
      )}

      {!erroCategorias && (
        <section className="cartao-caixa flex flex-col rounded-[12px] border border-caixa-border bg-caixa-surface">
          <header className="flex flex-wrap items-start justify-between gap-[12px] border-b border-caixa-border px-[16px] py-[16px] md:px-[24px] md:py-[18px]">
            <div className="flex flex-col gap-[3px]">
              <h2 className="text-[17px] font-bold leading-[1.2]">Categorias</h2>
              <p className="max-w-[70ch] text-[13px] leading-[1.4] text-caixa-muted">
                Cada uma agrupa os itens que aparecem juntos no formulário.
                Desativar tira a categoria (ou o item) do formulário da
                loja — nunca apaga, porque o histórico de desperdício já
                lançado precisa continuar legível.
              </p>
            </div>
            {!criandoCategoria && (
              <button
                type="button"
                onClick={() => setCriandoCategoria(true)}
                className="rounded-[10px] border border-caixa-accent px-[16px] py-[9px] text-[14px] font-semibold text-caixa-accent transition hover:bg-caixa-accent-soft"
              >
                Criar categoria
              </button>
            )}
          </header>

          <div className="flex flex-col gap-[14px] px-[16px] py-[18px] md:px-[24px] md:py-[20px]">
            {criandoCategoria && (
              <NovaCategoria aoFechar={() => setCriandoCategoria(false)} />
            )}

            {erroItens && (
              <p className="text-[13px] font-medium text-caixa-alerta">
                Os itens não carregaram:{" "}
                {erroItens instanceof Error
                  ? erroItens.message
                  : "erro desconhecido."}{" "}
                As categorias abaixo continuam disponíveis para criar,
                renomear e desativar.
              </p>
            )}

            {itensOrfaos > 0 && (
              <p className="text-[13px] font-medium text-caixa-alerta">
                {itensOrfaos === 1
                  ? "1 item chegou apontando para uma categoria fora desta lista — ele não aparece em nenhum card abaixo."
                  : `${itensOrfaos} itens chegaram apontando para uma categoria fora desta lista — eles não aparecem em nenhum card abaixo.`}
              </p>
            )}

            {carregandoCategorias ? (
              <p className="text-[14px] text-caixa-muted">Carregando...</p>
            ) : categoriasOrdenadas.length === 0 ? (
              <p className="max-w-[60ch] text-[14px] leading-[1.45] text-caixa-muted">
                Nenhuma categoria cadastrada.
              </p>
            ) : (
              <ul className="flex flex-col gap-[16px]">
                {categoriasOrdenadas.map((categoria) => (
                  <LinhaDaCategoria
                    key={categoria.id}
                    categoria={categoria}
                    itens={itensPorCategoria.get(categoria.id) ?? []}
                    carregandoItens={carregandoItens}
                    erroItens={Boolean(erroItens)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function NovaCategoria({ aoFechar }: { aoFechar: () => void }) {
  const criar = useCriarCategoria();
  const [nome, setNome] = useState("");

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!nome.trim()) return;
        criar.mutate(nome.trim(), {
          onSuccess: () => {
            setNome("");
            aoFechar();
          },
        });
      }}
      className="flex flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[16px] py-[14px]"
    >
      <Campo
        rotulo="Nome da categoria"
        valor={nome}
        aoMudar={setNome}
        placeholder="Salgados grande"
      />

      {criar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {criar.error instanceof Error
            ? criar.error.message
            : "Não foi possível criar a categoria."}
        </p>
      )}

      <div className="flex flex-wrap gap-[10px]">
        <button
          type="submit"
          disabled={criar.isPending || !nome.trim()}
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {criar.isPending ? "Criando..." : "Criar categoria"}
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

/** Corrigir o nome da categoria. Nao mexe em `ordem`: reordenar e uma
 *  decisao a parte, e misturar os dois num formulario so faria o "renomear"
 *  do dia a dia carregar um campo numerico que ninguem veio mexer. */
function EditarCategoria({
  categoria,
  aoFechar,
}: {
  categoria: CategoriaDeSalgado;
  aoFechar: () => void;
}) {
  const editar = useAtualizarCategoria();
  const [nome, setNome] = useState(categoria.nome);

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!nome.trim()) return;
        editar.mutate(
          { id: categoria.id, campos: { nome: nome.trim() } },
          { onSuccess: aoFechar },
        );
      }}
      className="flex flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[16px] py-[14px]"
    >
      <Campo rotulo="Nome da categoria" valor={nome} aoMudar={setNome} />

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

/**
 * Uma categoria, com seus itens dentro.
 *
 * Desativada, ela some do formulário — mas os itens dela, mesmo os que
 * continuam ativos, somem junto (é a categoria quem os agrupa lá). O aviso
 * fica no botão, e não escondido: quem desativa uma categoria com itens
 * ativos precisa saber que está tirando os dois do ar de uma vez.
 */
function LinhaDaCategoria({
  categoria,
  itens,
  carregandoItens = false,
  erroItens = false,
}: {
  categoria: CategoriaDeSalgado;
  itens: Salgado[];
  /** Itens ainda nao chegaram (endpoint proprio, independente da categoria):
   *  mostra "carregando", nao "nenhum item". */
  carregandoItens?: boolean;
  /** O endpoint de itens falhou: a categoria continua editavel, so a lista
   *  de itens dela fica marcada como indisponivel em vez de "vazia". */
  erroItens?: boolean;
}) {
  const definirAtivo = useAtualizarCategoria();
  const [editando, setEditando] = useState(false);
  const [criandoItem, setCriandoItem] = useState(false);

  const itensAtivos = itens.filter((item) => item.ativo).length;
  const foraDoFormulario = itens.length - itensAtivos;

  return (
    <li className="flex flex-col gap-[10px] rounded-[10px] border border-caixa-border px-[14px] py-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <span className="flex flex-wrap items-center gap-[8px]">
          <span
            className={`text-[15px] font-semibold ${
              categoria.ativo ? "text-caixa-ink" : "text-caixa-muted"
            }`}
          >
            {categoria.nome}
          </span>
          {!categoria.ativo && (
            <span className="rounded-full border border-caixa-warn/30 bg-caixa-warn-soft px-[10px] py-[2px] text-[12px] font-semibold text-caixa-warn">
              fora do formulário
            </span>
          )}
          <span className="text-[13px] text-caixa-muted">
            {resumoDaLista(itens.length, "item", "itens", [
              foraDoFormulario > 0 ? `${foraDoFormulario} fora do formulário` : null,
            ])}
          </span>
        </span>

        {!editando && (
          <div className="flex flex-wrap gap-[8px]">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-[10px] border border-caixa-border px-[14px] py-[8px] text-[13px] font-medium text-caixa-muted transition hover:border-caixa-accent/40 hover:bg-caixa-accent-soft hover:text-caixa-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
            >
              Renomear
            </button>
            <button
              type="button"
              disabled={definirAtivo.isPending}
              title={
                categoria.ativo
                  ? "Some do formulário da loja com os itens dela. O histórico de desperdício já lançado continua de pé."
                  : "Volta a aparecer no formulário da loja, com os itens que também estiverem ativos."
              }
              onClick={() =>
                definirAtivo.mutate({
                  id: categoria.id,
                  campos: { ativo: !categoria.ativo },
                })
              }
              className={`rounded-[10px] border px-[14px] py-[8px] text-[13px] font-medium transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                categoria.ativo
                  ? "border-caixa-border text-caixa-muted hover:border-caixa-warn/45 hover:bg-caixa-warn-soft hover:text-caixa-warn focus-visible:outline-caixa-warn"
                  : "border-caixa-accent/40 text-caixa-accent hover:bg-caixa-accent-soft focus-visible:outline-caixa-accent"
              }`}
            >
              {categoria.ativo ? "Desativar" : "Reativar"}
            </button>
          </div>
        )}
      </div>

      {editando && (
        <EditarCategoria categoria={categoria} aoFechar={() => setEditando(false)} />
      )}

      <div className="flex flex-col gap-[8px] pl-[4px]">
        {erroItens ? (
          <p className="text-[13px] font-medium text-caixa-alerta">
            Não foi possível carregar os itens desta categoria.
          </p>
        ) : carregandoItens ? (
          <p className="text-[13px] text-caixa-muted">Carregando itens...</p>
        ) : itens.length === 0 && !criandoItem ? (
          <p className="text-[13px] text-caixa-muted">
            Nenhum item nesta categoria.
          </p>
        ) : (
          <ul className="flex flex-col">
            {itens.map((item) => (
              <LinhaDoItem key={item.id} item={item} />
            ))}
          </ul>
        )}

        {criandoItem ? (
          <NovoItem categoria={categoria} aoFechar={() => setCriandoItem(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setCriandoItem(true)}
            className="self-start rounded-[10px] border border-caixa-accent/40 px-[12px] py-[6px] text-[13px] font-medium text-caixa-accent transition hover:bg-caixa-accent-soft"
          >
            Criar item nesta categoria
          </button>
        )}
      </div>
    </li>
  );
}

/** O cadastro de um item: so o nome. A categoria ja esta escolhida — e a que
 *  abriu o formulario — entao nao ha seletor nenhum aqui. */
function NovoItem({
  categoria,
  aoFechar,
}: {
  categoria: CategoriaDeSalgado;
  aoFechar: () => void;
}) {
  const criar = useCriarSalgado();
  const [nome, setNome] = useState("");

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!nome.trim()) return;
        criar.mutate(
          { nome: nome.trim(), categoria: categoria.id },
          {
            onSuccess: () => {
              setNome("");
              aoFechar();
            },
          },
        );
      }}
      className="flex flex-col gap-[10px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[14px] py-[12px]"
    >
      <Campo
        rotulo={`Nome do item em ${categoria.nome}`}
        valor={nome}
        aoMudar={setNome}
        placeholder="Coxinha"
      />

      <p className="text-[13px] leading-[1.45] text-caixa-muted">
        O mesmo nome pode existir em outra categoria — &quot;Coxinha&quot; em{" "}
        <em>Salgados grande</em> e em <em>Salgados mini</em> são itens
        diferentes. Repetido dentro desta categoria, o servidor recusa.
      </p>

      {criar.isError && (
        <p className="text-[13px] font-medium text-caixa-alerta">
          {criar.error instanceof Error
            ? criar.error.message
            : "Não foi possível criar o item."}
        </p>
      )}

      <div className="flex flex-wrap gap-[10px]">
        <button
          type="submit"
          disabled={criar.isPending || !nome.trim()}
          className="rounded-[10px] bg-caixa-accent px-[16px] py-[9px] text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {criar.isPending ? "Criando..." : "Criar item"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[14px] py-[9px] text-[13px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Corrigir o nome de um item. Nao muda a categoria: mover um item de
 *  categoria e uma decisao de catalogo, nao um conserto de digitacao — e este
 *  formulario e so o conserto. */
function EditarItem({ item, aoFechar }: { item: Salgado; aoFechar: () => void }) {
  const editar = useAtualizarSalgado();
  const [nome, setNome] = useState(item.nome);

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!nome.trim()) return;
        editar.mutate(
          { id: item.id, campos: { nome: nome.trim() } },
          { onSuccess: aoFechar },
        );
      }}
      className="flex flex-col gap-[10px] rounded-[10px] border border-caixa-border bg-caixa-faixa px-[14px] py-[12px]"
    >
      <Campo rotulo="Nome do item" valor={nome} aoMudar={setNome} />

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
          className="rounded-[10px] bg-caixa-accent px-[16px] py-[9px] text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
        >
          {editar.isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[14px] py-[9px] text-[13px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Um item na lista.
 *
 * So existe desativar aqui, nunca apagar — nao ha nem um botao "Apagar" para
 * aparecer depois de desativado, como existe em loja e funcionario. O
 * servidor recusa apagar um item que ja tem desperdicio lancado (PROTECT), e
 * quase todo item chega a esse ponto rapido; oferecer um botao que quase
 * sempre volta em erro so treina a gerencia a ignorar a mensagem. Desativado,
 * o item some do seletor do formulario da loja e o historico de desperdicio
 * ja lancado continua de pe, com o nome dele.
 */
function LinhaDoItem({ item }: { item: Salgado }) {
  const definirAtivo = useAtualizarSalgado();
  const [editando, setEditando] = useState(false);

  return (
    <li className="flex flex-col gap-[8px] border-t border-caixa-border py-[10px] first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <span className="flex flex-wrap items-center gap-[8px]">
          <span
            className={`text-[14px] font-medium ${
              item.ativo ? "text-caixa-ink" : "text-caixa-muted"
            }`}
          >
            {item.nome}
          </span>
          {!item.ativo && (
            <span className="rounded-full border border-caixa-warn/30 bg-caixa-warn-soft px-[10px] py-[2px] text-[12px] font-semibold text-caixa-warn">
              fora do formulário
            </span>
          )}
        </span>

        {!editando && (
          <div className="flex flex-wrap gap-[8px]">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-[10px] border border-caixa-border px-[12px] py-[6px] text-[12px] font-medium text-caixa-muted transition hover:border-caixa-accent/40 hover:bg-caixa-accent-soft hover:text-caixa-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
            >
              Renomear
            </button>
            <button
              type="button"
              disabled={definirAtivo.isPending}
              title={
                item.ativo
                  ? "Some do seletor do formulário da loja. Não é possível excluir um item já usado em lançamentos — o histórico de desperdício continua com o nome dele."
                  : "Volta a aparecer no seletor do formulário da loja."
              }
              onClick={() =>
                definirAtivo.mutate({
                  id: item.id,
                  campos: { ativo: !item.ativo },
                })
              }
              className={`rounded-[10px] border px-[12px] py-[6px] text-[12px] font-medium transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                item.ativo
                  ? "border-caixa-border text-caixa-muted hover:border-caixa-warn/45 hover:bg-caixa-warn-soft hover:text-caixa-warn focus-visible:outline-caixa-warn"
                  : "border-caixa-accent/40 text-caixa-accent hover:bg-caixa-accent-soft focus-visible:outline-caixa-accent"
              }`}
            >
              {item.ativo ? "Desativar" : "Reativar"}
            </button>
          </div>
        )}
      </div>

      {editando && <EditarItem item={item} aoFechar={() => setEditando(false)} />}
    </li>
  );
}

/** Um campo de texto do formulário — igual ao das outras telas de cadastro. */
function Campo({
  rotulo,
  valor,
  aoMudar,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-[180px] flex-1 flex-col gap-[5px]">
      <span className="text-[13px] font-medium text-caixa-muted">{rotulo}</span>
      <input
        type="text"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-[10px] border border-caixa-border bg-caixa-surface p-[12px] text-[15px] text-caixa-ink outline-none transition placeholder:text-caixa-muted focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15"
      />
    </label>
  );
}
