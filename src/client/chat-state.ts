/**
 * Máquina de estados pura del envío del chat (#145 §2.5). Separada del DOM
 * para poder testearla en Node: decide si un input se puede enviar y
 * administra el flag `sending` SIN quedar trabado (regresión: el flag se
 * seteaba antes del check de turnos y el early-return nunca lo reseteaba,
 * dejando el chat mudo).
 */
export const MAX_USER_TURNS = 4;

export interface ChatGate {
  sending: boolean;
  userTurns: number;
}

export function createChatGate(): ChatGate {
  return { sending: false, userTurns: 0 };
}

export type SendDecision = "send" | "sending" | "empty" | "too-long" | "max-turns";

/**
 * Decide el próximo paso SIN mutar el estado. Solo "send" habilita beginSend;
 * todos los demás son early-return limpios (el flag nunca queda seteado).
 */
export function sendDecision(gate: ChatGate, input: string, maxChars: number): SendDecision {
  if (gate.sending) return "sending";
  const text = input.trim();
  if (!text) return "empty";
  if (text.length > maxChars) return "too-long";
  if (gate.userTurns >= MAX_USER_TURNS) return "max-turns";
  return "send";
}

/** Marca el envío en curso. Llamar sólo tras sendDecision === "send". */
export function beginSend(gate: ChatGate): void {
  gate.sending = true;
}

/** Cierra el envío (éxito o error) y, si hubo respuesta, cuenta el turno. */
export function endSend(gate: ChatGate, turnCompleted: boolean): void {
  gate.sending = false;
  if (turnCompleted) gate.userTurns += 1;
}
