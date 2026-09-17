import { TopbarPainel } from "@/features/fechamento/components/TopbarPainel";

/**
 * A casca das telas de gestao: /fechamentos, /por-loja, /saidas, /graficos e
 * /empresa. O parenteses no nome da pasta e um route group — agrupa as rotas
 * sem entrar no endereco, entao as URLs continuam as mesmas.
 *
 * Existe por causa de uma conta que so aparece no DevTools. A topbar era
 * renderizada dentro de cada pagina; navegar entre duas telas do painel
 * desmontava e remontava a topbar inteira, e com ela os cinco <Link> — que
 * refaziam o prefetch de todas as rotas a cada troca de tela. Era o mesmo
 * punhado de requisicoes ?_rsc= se repetindo a cada clique.
 *
 * Num layout, a topbar e montada uma vez e sobrevive a navegacao: o prefetch
 * acontece uma vez, e o que muda de fato e so o conteudo abaixo dela. De
 * quebra, o cabecalho para de piscar na troca de tela.
 *
 * Server component de proposito: nao ha estado aqui, e assim ele nao entra no
 * bundle que o navegador baixa. A topbar continua sendo cliente (ela le o
 * caminho atual para marcar a aba).
 */
export default function LayoutDoPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-caixa-bg font-sans text-caixa-ink">
      <TopbarPainel />
      {children}
    </div>
  );
}
