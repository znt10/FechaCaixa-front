/* Service worker do formulario.
 *
 * Ele existe por um motivo so: sem um service worker com handler de fetch, o
 * Chrome nao oferece "instalar aplicativo". E o que a loja precisa e o icone
 * na tela inicial e a janela sem barra de navegador.
 *
 * ELE NAO GUARDA NADA, e isso e deliberado. A tentacao num PWA e cachear as
 * respostas para abrir rapido; aqui isso reintroduziria o bug que acabou de
 * ser corrigido — a lista de lojas e de quem retira dinheiro congelando no
 * aparelho depois que a gerente cadastra alguem. O formulario precisa de
 * internet, e sempre precisou; quem tentar lancar sem rede recebe o erro do
 * proprio formulario, que e melhor do que um formulario que abre offline e
 * perde o lancamento.
 *
 * Se um dia o cache entrar aqui, a regra e: nunca sob /backend/ nem /api/.
 */

self.addEventListener("install", () => {
  // Assume o controle sem esperar a aba antiga fechar — o celular da loja
  // fica dias com a mesma aba aberta.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      // Limpa qualquer cache deixado por uma versao anterior deste arquivo.
      const nomes = await caches.keys();
      await Promise.all(nomes.map((nome) => caches.delete(nome)));
      await self.clients.claim();
    })(),
  );
});

// Precisa existir para o navegador considerar o app instalavel. Passa direto
// para a rede: o worker nao decide nada sobre o conteudo.
self.addEventListener("fetch", () => {});
