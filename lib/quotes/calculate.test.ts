import { describe, it, expect } from "vitest";
import { calculateQuote } from "./calculate";
import { canTransition } from "./status";

describe("calculateQuote", () => {
  it("soma itens e aplica desconto", () => {
    const r = calculateQuote(
      [{ description: "A", quantity: 2, unitPrice: 50 },
       { description: "B", quantity: 1, unitPrice: 100 }],
      10
    );
    expect(r.subtotal).toBe(200);
    expect(r.total).toBe(180);
  });

  it("arredonda centavos", () => {
    const r = calculateQuote([{ description: "A", quantity: 3, unitPrice: 0.1 }]);
    expect(r.total).toBe(0.3);
  });
});

describe("canTransition", () => {
  it("permite draft → sent", () => expect(canTransition("draft", "sent")).toBe(true));
  it("bloqueia draft → accepted", () => expect(canTransition("draft", "accepted")).toBe(false));
  it("estados finais não saem", () => expect(canTransition("accepted", "sent")).toBe(false));
});