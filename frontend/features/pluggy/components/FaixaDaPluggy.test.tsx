import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FaixaDaPluggyVista } from "./FaixaDaPluggy";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("FaixaDaPluggyVista", () => {
  it("desenha o link quando há texto", () =>
    expect(html(<FaixaDaPluggyVista texto="A Pluggy da X caiu — ver" />)).toContain(
      'href="/plataforma/pluggy"',
    ));
  it("não desenha nada sem texto", () =>
    expect(html(<FaixaDaPluggyVista texto={null} />)).toBe(""));
});
