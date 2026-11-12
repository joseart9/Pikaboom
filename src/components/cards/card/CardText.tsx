// Card rules text: `**bold**` markup and line breaks; bold keywords/ability words get their glossary as a tooltip.
import { Fragment } from "react";
import { es } from "@/game/cards/i18n/es";

type Entry = { name: string; text: string };

const GLOSSARY: Entry[] = [...Object.values(es.keyword), ...Object.values(es.abilityWords)].sort((a, b) => b.name.length - a.name.length);

/** Reminder text for the first keyword/ability word a bold chunk starts with (`{n}` from "Escudo (2)"). */
export function glossaryFor(chunk: string): string | undefined {
  const clean = chunk.replace(/[.:]+$/, "").trim();
  const hit = GLOSSARY.find((g) => clean.startsWith(g.name));
  if (!hit) return undefined;
  const n = /\((\d+)\)/.exec(clean)?.[1];
  return n ? hit.text.replaceAll("{n}", n) : hit.text;
}

export function CardText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <span>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/).map((part, pi) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              const inner = part.slice(2, -2);
              return (
                <strong key={pi} title={glossaryFor(inner)}>
                  {inner}
                </strong>
              );
            }
            return <Fragment key={pi}>{part}</Fragment>;
          })}
        </Fragment>
      ))}
    </span>
  );
}
