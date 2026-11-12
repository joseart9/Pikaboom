// Shared fields of every core-set card: version 1, set "core", art key = card id (§20.1).
export function core<const Id extends string>(id: Id) {
  return { id, version: 1, set: "core" as const, art: id };
}
