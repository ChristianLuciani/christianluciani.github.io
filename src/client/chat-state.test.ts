/**
 * Máquina de estados del envío del chat (#145): el flag `sending` nunca puede
 * quedar trabado por un early-return (regresión del pase 3: el check de
 * max-turnos devolvía con `sending = true` y el chat quedaba mudo).
 */
import { describe, expect, it } from "vitest";
import {
  beginSend,
  createChatGate,
  endSend,
  MAX_USER_TURNS,
  sendDecision
} from "./chat-state.ts";

describe("chat-state — decisiones de envío", () => {
  it("empty / too-long / max-turns no mutan el estado (no traban `sending`)", () => {
    const gate = createChatGate();
    expect(sendDecision(gate, "   ", 300)).toBe("empty");
    expect(sendDecision(gate, "x".repeat(301), 300)).toBe("too-long");
    gate.userTurns = MAX_USER_TURNS;
    expect(sendDecision(gate, "hola", 300)).toBe("max-turns");
    expect(gate.sending).toBe(false);
  });

  it("mientras hay un envío en curso, el próximo click es 'sending' y no cambia nada", () => {
    const gate = createChatGate();
    expect(sendDecision(gate, "hola", 300)).toBe("send");
    beginSend(gate);
    expect(sendDecision(gate, "otro", 300)).toBe("sending");
    expect(gate.sending).toBe(true);
  });

  it("endSend libera siempre: tras error el chat sigue enviando; tras éxito cuenta el turno", () => {
    const gate = createChatGate();
    beginSend(gate);
    endSend(gate, false); // error → no cuenta turno, pero libera
    expect(gate.sending).toBe(false);
    expect(sendDecision(gate, "hola de nuevo", 300)).toBe("send");

    beginSend(gate);
    endSend(gate, true);
    expect(gate.userTurns).toBe(1);
    // tras 4 turnos completados, el 5.º es max-turns Y el estado queda limpio
    for (let i = 0; i < MAX_USER_TURNS - 1; i += 1) {
      beginSend(gate);
      endSend(gate, true);
    }
    expect(gate.userTurns).toBe(MAX_USER_TURNS);
    expect(sendDecision(gate, "uno más", 300)).toBe("max-turns");
    expect(gate.sending).toBe(false); // no quedó trabado: la máquina sigue respondiendo
  });
});
