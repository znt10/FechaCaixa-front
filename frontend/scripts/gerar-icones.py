"""Gera os icones do PWA. Rode com: python3 scripts/gerar-icones.py

Desenhados em codigo, e nao exportados de um editor, para que mudar a cor da
marca seja mudar uma linha aqui — e para que quem vier depois consiga refazer
os quatro tamanhos sem procurar um arquivo fonte perdido.

O desenho e uma gaveta de caixa fechada: a frente branca, a tampa marcada por
uma faixa no alto e o puxador embaixo. Testei as alternativas a 48px, que e o
tamanho real na tela inicial do celular, e so esta le como gaveta — sem a
faixa da tampa o icone vira "um cartao com um traco", e com a faixa mais
baixa vira cartao de credito.
"""

from pathlib import Path

from PIL import Image, ImageDraw

VERDE = (20, 98, 74)  # caixa-accent, #14624a
BRANCO = (255, 255, 255)

DESTINO = Path(__file__).resolve().parent.parent / "public" / "icones"


def desenhar(tamanho: int, maskable: bool = False) -> Image.Image:
    # Desenha 8x maior e reduz no fim: e assim que se consegue borda suave no
    # PIL, que nao tem antialias nas primitivas.
    escala = 8
    n = tamanho * escala
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # O Android recorta o icone em varias formas (circulo, gota, quadrado
        # arredondado). O fundo sangra ate a borda e o desenho fica nos 80%
        # centrais; o canto arredondado quem faz e o sistema.
        d.rectangle([0, 0, n, n], fill=VERDE)
        area = 0.80
    else:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=VERDE)
        area = 0.92

    larg = n * area * 0.72
    alt = larg * 0.72
    x0 = (n - larg) / 2
    y0 = (n - alt) / 2

    d.rounded_rectangle([x0, y0, x0 + larg, y0 + alt], radius=alt * 0.14, fill=BRANCO)
    # A tampa: sem ela o icone le como cartao, nao como gaveta.
    d.rectangle([x0, y0 + alt * 0.20, x0 + larg, y0 + alt * 0.275], fill=VERDE)
    # O puxador.
    pux_larg = larg * 0.48
    pux_alt = alt * 0.10
    d.rounded_rectangle(
        [
            (n - pux_larg) / 2,
            y0 + alt * 0.62,
            (n - pux_larg) / 2 + pux_larg,
            y0 + alt * 0.62 + pux_alt,
        ],
        radius=pux_alt / 2,
        fill=VERDE,
    )

    return img.resize((tamanho, tamanho), Image.LANCZOS)


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    for tamanho in (192, 512):
        desenhar(tamanho).save(DESTINO / f"icone-{tamanho}.png")
    desenhar(512, maskable=True).save(DESTINO / "icone-maskable-512.png")
    # O iOS ignora o manifest e usa esta: ela nao pode ter transparencia.
    desenhar(180).convert("RGB").save(DESTINO / "apple-touch-icon.png")
    print(f"icones gerados em {DESTINO}")


if __name__ == "__main__":
    main()
