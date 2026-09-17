"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useModuloDeNotas } from "@/features/admin/hooks/useModuloDeNotas";
import { BotaoDeExportar } from "@/features/fechamento/components/BotaoDeExportar";
import {
  AREAS,
  areaDaRota,
  paginasDaArea,
  type Area,
} from "@/features/fechamento/areas-do-painel";
import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";
import { logout } from "@/shared/services/auth";
import { useAuthStore } from "@/shared/stores/authStore";

const semAcento = (texto?: string) =>
  (texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const ehGerente = (grupo?: string) => semAcento(grupo) === "gerente";

/**
 * Topbar das telas de gestao. A navegacao mora aqui, e nao numa sidebar: sao
 * quatro destinos, e uma sidebar comeria 240px de largura numa tela que e
 * tabela.
 *
 * Alem da navegacao ela carrega a unica acao que nao pertence a nenhuma tela:
 * baixar a planilha. O arquivo e o mesmo nas quatro telas do painel, entao
 * repeti-lo na toolbar de duas delas fazia parecer que cada uma exportava a
 * sua — e deixava as outras duas sem saida nenhuma.
 *
 * No celular ela vira duas linhas: identidade e conta em cima, navegacao
 * embaixo, rolando na horizontal. Numa linha so, os cinco destinos empurravam
 * o nome de quem esta logado para fora da tela — e nenhuma aba cabia inteira.
 */
export function TopbarPainel() {
  const caminho = usePathname();
  const usuarioSalvo = useAuthStore((estado) => estado.user);
  // O store zustand so e escrito no login; numa aba aberta direto aqui (cookie
  // ainda valido) ele vem vazio. A consulta roda sempre, e nao so quando o
  // store esta vazio: e dela que sai a lista de modulos da empresa, que o
  // login nao grava. O nome ainda sai do store enquanto ela nao volta, para a
  // barra nao abrir sem identidade.
  const usuarioDaSessao = useUsuarioAtual();
  const usuario = usuarioSalvo ?? usuarioDaSessao.data;
  const moduloDeNotas = useModuloDeNotas();

  // Derivada da rota aberta, e nao guardada: a URL nao tem como discordar de
  // si mesma. Estado velho sobrevivendo a uma troca ja fez este painel mostrar
  // a empresa errada depois de um login novo.
  const area = areaDaRota(caminho);
  const temDespesas = moduloDeNotas.ativo;

  return (
    <header className="w-full border-b border-caixa-border bg-caixa-surface md:h-[93px]">
      <div className="mx-auto flex h-full max-w-[1440px] flex-col gap-[10px] px-[16px] py-[12px] md:flex-row md:items-center md:justify-between md:gap-[24px] md:px-[40px] md:py-0">
        <div className="flex items-center justify-between gap-[16px] md:justify-start md:gap-[36px]">
          <div className="flex flex-col gap-[2px]">
            {/* Contraste de peso entre as duas metades, e nao de cor: o verde
                ja tem trabalho nesta barra (marcar onde voce esta), e usa-lo
                tambem na marca faria a marca competir com a navegacao. */}
            <span className="text-[17px] leading-[1.25] tracking-[-0.02em] md:text-[20px]">
              <span className="font-medium">Fecha</span>
              <span className="font-bold">Caixa</span>
            </span>
            {/* O seletor toma o lugar do antigo "Painel de gestao": aquela
                linha nao informava nada — a pessoa esta olhando para o painel.
                Trocada por algo com trabalho a fazer, o cabecalho nao ganha
                peso nenhum. Sem o modulo de despesas ela volta a ser texto:
                um seletor de uma opcao so e pior que nenhum. */}
            {temDespesas ? (
              <SeletorDeArea area={area} />
            ) : (
              <span className="text-[13px] leading-[1.4] text-caixa-muted">
                Painel de gestão
              </span>
            )}
          </div>

          {/* No celular a conta e a planilha sobem para esta linha, ao lado do
              titulo: embaixo elas roubariam a largura da navegacao, e a
              planilha em largura total dentro da pagina empurrava o numero
              grande para fora da dobra.

              A planilha vem depois da conta so aqui: encostada na borda
              direita da tela, o painel dela de 300px abre inteiro — atras do
              avatar, ele comecaria antes do zero e a esquerda ficaria cortada
              pelo overflow-x escondido do body. */}
          <div className="flex items-center gap-[10px] md:hidden">
            <Conta usuario={usuario} className="flex" />
            <BotaoDeExportar />
          </div>
        </div>

        {/* -mx-[16px] + px-[16px]: a rolagem vai de borda a borda da tela, e
            nao dentro de uma caixa com margem — no celular a primeira e a
            ultima aba ficariam cortadas por 16px de nada. */}
        {/* No desktop a fila desce ate a borda de baixo da barra: a marca da
            tela atual se apoia nela, e a borda deixa de ser so um divisor —
            vira o trilho onde as telas ficam marcadas. No celular a fila e uma
            faixa propria que rola, longe dessa borda, entao la a marca
            continua sendo o preenchimento: um risco de 2px numa faixa que rola
            passa despercebido. */}
        <nav className="-mx-[16px] flex gap-[4px] overflow-x-auto px-[16px] [scrollbar-width:none] md:mx-0 md:gap-[2px] md:self-stretch md:overflow-visible md:px-0">
            {paginasDaArea(area, {
              gerente: ehGerente(usuario?.group),
              notas: moduloDeNotas.ativo,
            }).map(({ href, rotulo }) => {
              const atual = caminho === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={atual ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-[10px] px-[14px] py-[9px] text-[15px] font-medium transition md:flex md:h-full md:items-center md:rounded-none md:border-b-2 md:px-[16px] md:py-0 ${FOCO} ${
                    atual
                      ? "bg-caixa-accent-soft text-caixa-accent md:bg-transparent md:border-caixa-accent"
                      : "text-caixa-muted hover:text-caixa-ink md:border-transparent md:hover:border-caixa-border"
                  }`}
                >
                  {rotulo}
                </Link>
              );
            })}
        </nav>

        {/* No desktop a acao vem antes da identidade: a conta fecha a barra,
            como em toda topbar. */}
        <div className="hidden items-center gap-[16px] md:flex">
          <BotaoDeExportar />
          <Conta usuario={usuario} className="flex" />
        </div>
      </div>
    </header>
  );
}

/**
 * A area em que se esta, e a porta para a outra.
 *
 * Menu proprio em vez de <select>: o nativo abre com a cara do sistema
 * operacional no meio de uma barra que nao se parece com nenhum, e no celular
 * vira a roda do iOS — pesada demais para duas opcoes.
 */
/**
 * Fecha um menu ao clicar fora ou apertar Esc.
 *
 * Compartilhado pelas duas peças da barra que abrem menu — a área e a conta —
 * porque elas devem fechar do mesmo jeito. Duas implementações da mesma regra
 * viram duas regras diferentes na primeira vez que alguém mexer numa só.
 */
function useFechaAoSair(aberto: boolean, fechar: () => void) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const clicouFora = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) fechar();
    };
    const apertouEsc = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar();
    };

    document.addEventListener("mousedown", clicouFora);
    document.addEventListener("keydown", apertouEsc);
    return () => {
      document.removeEventListener("mousedown", clicouFora);
      document.removeEventListener("keydown", apertouEsc);
    };
  }, [aberto, fechar]);

  return caixa;
}

/** A moldura dos dois menus da barra: mesma borda, mesma sombra, mesma
 *  distância do que os abre. */
const MENU =
  "absolute z-20 overflow-hidden rounded-[10px] border border-caixa-border bg-caixa-surface py-[4px] shadow-lg";

/** O anel de foco de teclado, igual em tudo que é clicável na barra. */
const FOCO =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent";

function SeletorDeArea({ area }: { area: Area }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const caixa = useFechaAoSair(aberto, useCallback(() => setAberto(false), []));

  const atual = AREAS.find((opcao) => opcao.id === area) ?? AREAS[0];

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((estava) => !estava)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={`flex items-center gap-[6px] rounded-[8px] text-[13px] leading-[1.4] text-caixa-muted transition hover:text-caixa-ink ${FOCO}`}
      >
        {atual.rotulo}
        <span aria-hidden className="text-[10px]">
          ▾
        </span>
      </button>

      {aberto && (
        <div
          role="menu"
          className={`${MENU} left-0 top-[calc(100%+6px)] min-w-[212px]`}
        >
          {AREAS.map((opcao) => {
            const nesta = opcao.id === area;
            return (
              <button
                key={opcao.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAberto(false);
                  // Sempre para a primeira tela da area: a pessoa escolheu um
                  // assunto, nao uma tela especifica.
                  if (!nesta) router.push(opcao.inicio);
                }}
                className={`flex w-full items-center gap-[8px] px-[14px] py-[9px] text-left text-[14px] transition ${FOCO} ${
                  nesta
                    ? "font-semibold text-caixa-accent"
                    : "text-caixa-ink hover:bg-caixa-accent-soft/40"
                }`}
              >
                <span aria-hidden className="text-[10px]">
                  {nesta ? "●" : "\u00a0"}
                </span>
                {opcao.rotulo}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Quem esta logado, e a saida. No celular so a inicial: o e-mail inteiro
 *  ocuparia meia tela para dizer o que a inicial ja diz.
 *
 *  Menu, e nao um "Sair" exposto ao lado do nome: sair e a unica acao da barra
 *  que descarta trabalho em andamento, e acao assim nao fica a um clique de
 *  distancia o tempo todo. Abre com a mesma forma do seletor de area — duas
 *  pecas com cara de menu na mesma barra devem abrir igual.
 *
 *  Ate pouco tempo nao existia saida nenhuma no painel: trocar de login exigia
 *  limpar os dados do navegador na mao, e quem nao sabia disso continuava
 *  vendo a empresa de quem entrou antes. */
function Conta({
  usuario,
  className,
}: {
  usuario?: { first_name?: string; email?: string };
  className: string;
}) {
  const nome = usuario?.first_name || usuario?.email || "Minha conta";
  const cliente = useQueryClient();
  const [saindo, setSaindo] = useState(false);
  const [aberto, setAberto] = useState(false);
  const caixa = useFechaAoSair(aberto, useCallback(() => setAberto(false), []));

  const sair = async () => {
    if (saindo) return;
    setSaindo(true);

    // `logout` apaga o cookie no servidor e o usuario do localStorage. O que
    // ele NAO faz sozinho e esvaziar o cache do React Query: sem esta linha,
    // quem entrasse em seguida veria as lojas e os fechamentos da empresa
    // anterior ate cada consulta revalidar — dado de outro cliente na tela.
    await logout();
    cliente.clear();

    // Navegacao dura, e nao router.push: e a unica forma de garantir que nao
    // sobrou estado em memoria de quem estava aqui. Sair e raro; um
    // recarregamento inteiro custa menos que uma sobra invisivel.
    window.location.replace("/login");
  };

  return (
    <div ref={caixa} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setAberto((estava) => !estava)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={`flex items-center gap-[10px] rounded-[10px] transition hover:opacity-80 ${FOCO}`}
      >
        <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-caixa-accent text-[13px] font-semibold text-white">
          {(usuario?.first_name || usuario?.email || "?").charAt(0).toUpperCase()}
        </span>
        <span className="hidden text-[15px] leading-[1.4] md:inline">{nome}</span>
      </button>

      {aberto && (
        <div role="menu" className={`${MENU} right-0 top-[calc(100%+8px)] min-w-[224px]`}>
          {/* O e-mail inteiro aparece aqui, e so aqui: e a resposta para "de
              quem e esta sessao?", que na barra so cabia como inicial. */}
          {usuario?.email && (
            <p className="border-b border-caixa-border px-[14px] pb-[10px] pt-[8px] text-[13px] leading-[1.4] text-caixa-muted">
              {usuario.email}
            </p>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={sair}
            disabled={saindo}
            className={`w-full px-[14px] py-[10px] text-left text-[14px] text-caixa-ink transition hover:bg-caixa-accent-soft/40 disabled:opacity-45 ${FOCO}`}
          >
            {saindo ? "Saindo..." : "Sair"}
          </button>
        </div>
      )}
    </div>
  );
}
