// i18n accessors (ADR-17). Components call t("section.key", params); card texts come from cardName/cardText.
import type { CardId } from "../catalog/types";
import { es, type CardText, type Dictionary } from "./es";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends object
      ? Leaves<T[K], `${P}${K}.`>
      : never;
}[keyof T & string];

/** Card names/texts by id (§9.6): what `validateCatalog` checks every def against. */
export type CardDictionary = Record<string, CardText>;

/** Every dotted path to a string in the dictionary. `cards` is excluded: use cardName()/cardText(). */
export type MessageKey = Leaves<Omit<Dictionary, "cards">>;

/** Looks up a dotted key and replaces `{param}` placeholders. Unknown keys (or non-string values) return the key. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let node: unknown = es;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, part)) return key;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") return key;
  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

function cardEntry(id: CardId): CardText | undefined {
  return Object.prototype.hasOwnProperty.call(es.cards, id) ? es.cards[id] : undefined;
}

/** Spanish card name; falls back to the card id. */
export function cardName(id: CardId): string {
  return cardEntry(id)?.name ?? id;
}

/** Spanish rules text; falls back to "". */
export function cardText(id: CardId): string {
  return cardEntry(id)?.text ?? "";
}
