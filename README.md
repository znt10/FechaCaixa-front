# FechaCaixa — Frontend

> Parte do [FechaCaixa](https://github.com/znt10/FechaCaixa). A API está em
> [FechaCaixa-back](https://github.com/znt10/FechaCaixa-back).

Interface do FechaCaixa, em Next.js 16 (App Router) e TypeScript.

Duas metades:

- **o formulário** (`/<empresa>`), aberto no celular da loja **sem login** — o
  aparelho entra uma vez com o código da empresa e dali em diante só lança o
  caixa do turno. Instala como app (PWA);
- **o painel** da gerência, com login: fechamentos, visão por loja, saídas,
  gráficos, catálogo de salgados, notas fiscais e a tela da empresa.

O código da aplicação fica em [`frontend/`](frontend). Todos os comandos deste
README rodam **de dentro dessa pasta**.

## Sumário

- [Tecnologias](#tecnologias)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como a autenticação funciona](#como-a-autenticação-funciona)
- [Arquitetura](#arquitetura)
- [Rotas](#rotas)
- [Testes](#testes)

## Tecnologias

| O que | Usado para |
|---|---|
| Next.js 16 (App Router) | base do projeto |
| React 19 / TypeScript | componentes e tipos |
| Tailwind CSS 4 | estilo |
| HeroUI | componentes prontos |
| TanStack Query (+ persist) | cache e sincronia dos dados do servidor |
| Zustand | estado local de sessão |
| next-themes | tema claro/escuro |
| sonner | avisos na tela |
| Vitest | testes |

## Como rodar

### Com Docker (recomendado)

O front entra **na mesma rede** do compose do backend, para falar com o Django
pelo nome de serviço `api`. Por isso o backend sobe primeiro:

```bash
cd ../backend              # ou onde estiver o FechaCaixa-back
docker compose up -d

cd ../frontend/frontend
cp .env.example .env.local
docker compose up
```

O front sobe em `http://localhost:3000`.

```bash
docker compose up            # sobe (sem rebuild)
docker compose up -d         # em segundo plano
docker compose up --build    # refazendo a imagem (depois de mexer no package.json)
docker compose logs -f       # acompanha os logs
docker compose down          # derruba
```

O `node_modules` fica num volume do container, não na pasta do host. Por isso
instalar pacote pede um `--build` depois.

Se o `docker compose up` reclamar que a rede `fechacaixa_back_default` não
existe, o backend não está de pé — suba ele primeiro.

### Sem Docker, com Node na máquina

Precisa de Node 20.9+ (o container usa 22) e do backend acessível em
`http://localhost:8000`.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run lint     # lint (inclui a regra de fronteira de arquitetura)
npm test         # testes
```

## Variáveis de ambiente

Copie [`frontend/.env.example`](frontend/.env.example) para
`frontend/.env.local`. O arquivo documenta cada uma.

| Variável | Para que serve |
|---|---|
| `API_PROXY_URL` | destino do rewrite `/backend/*`. Sem ela, `http://localhost:8000` |
| `NEXT_DEV_ORIGINS` | opcional; o IP da máquina, para o celular da loja carregar os assets em `next dev` |
| `NEXT_WATCH_POLL_MS` | opcional; liga o polling do Turbopack. Só faz sentido em bind mount do Windows |

**Nenhuma delas leva `NEXT_PUBLIC_`**, e isso é de propósito: o navegador nunca
chama a API direto, então não precisa saber onde ela está. E não existe segredo
no front — quem emite e valida JWT é o backend.

No container o destino da API é `http://api:8000` (nome do serviço na rede do
backend), não `localhost` — que lá dentro apontaria para o próprio front.

## Como a autenticação funciona

Vale entender antes de mexer, porque explica várias decisões do código.

O backend emite JWT em **cookies HTTP-only**. O JavaScript do front nunca lê o
token — essa é a defesa contra roubo de sessão por XSS.

Para o navegador tratar esses cookies como first-party, toda chamada de API sai
para o **próprio domínio do front**, em `/backend/...`, e o
[`next.config.ts`](frontend/next.config.ts) reescreve para o Django.

O [`proxy.ts`](frontend/proxy.ts) (middleware) cuida do resto:

- barra rotas privadas para quem não está logado e renova o token expirado;
- filtra por papel — `Admin`, `Gerente` e `Funcionario` enxergam conjuntos
  diferentes de rotas, declarados em `ROLE_ROUTES`;
- trata qualquer caminho de um segmento só que não seja rota do app
  (`/primavera`) como **endereço de empresa**, e deixa passar sem login — quem
  chega ali sem o cookie do aparelho vê a tela do código.

O controle de papel no middleware é conveniência de navegação, não segurança: a
permissão de verdade é aplicada pelo backend em cada requisição.

## Arquitetura

Organização por **feature**, não por tipo de arquivo. O que muda junto fica
junto.

```text
frontend/
  app/          rotas (App Router) — monta a tela, não guarda regra de domínio
    (painel)/   as telas com login
    [conta]/    o formulário, no endereço de cada empresa
  features/     uma pasta por domínio, dona do próprio código
    fechamento/   o formulário e o painel de caixa
    admin/        empresa, lojas, notas fiscais
    catalogo/     catálogo de salgados
      components/  hooks/  services/
  shared/       o que serve a todos: cliente HTTP, auth, store de sessão
  proxy.ts      middleware de rota
```

A regra que sustenta isso:

> `shared/` não importa de rota nem de feature.

Se `shared/` puxasse de uma feature, a dependência se inverteria e a pasta
deixaria de ser comum na prática. A regra é verificada no lint
([`eslint.config.mjs`](frontend/eslint.config.mjs)) — não depende de ninguém
lembrar dela na revisão.

As regras de cálculo (totais do turno, saídas, dados dos gráficos, revisão do
envio) moram em módulos puros ao lado da feature — `painel-dados.ts`,
`saidas-dados.ts`, `revisao-do-envio.ts` — e cada um tem o seu `.test.ts`. O
componente só desenha.

## Rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/<empresa>` | formulário de fechamento do turno | público (cookie do aparelho) |
| `/fechamento` | entrada pelo código da empresa | público |
| `/login`, `/esqueci-senha`, `/redefinir-senha/[token]` | acesso | público |
| `/confirmar-conta/[token]` | confirmação de cadastro | público |
| `/fechamentos` | lista dos fechamentos, conferência e correção | painel |
| `/por-loja` | quanto cada loja fez e o que falta lançar | painel |
| `/saidas` | retiradas, despesas, consumo e desperdício | painel |
| `/graficos` | gráficos do período | painel |
| `/notas-fiscais` | importação de NF-e (módulo por empresa) | painel |
| `/catalogo` | catálogo de salgados | painel |
| `/empresa` | código de acesso, lojas, funcionários, aparelhos | só `Gerente` |

## Testes

```bash
npm test
```

Ou, pelo container:

```bash
docker compose exec front npm test
```
