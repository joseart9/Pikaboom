import { describe, expect, it } from "vitest";
import { mulliganReducer, replaceList } from "./mulligan";

const HAND = ["c1", "c2", "c3", "c4"];

describe("mulligan selection reducer (Phase 11 I)", () => {
  it("toggles a card on and off", () => {
    const a = mulliganReducer([], { t: "toggle", iid: "c2" }, HAND);
    expect(a).toEqual(["c2"]);
    const b = mulliganReducer(a, { t: "toggle", iid: "c4" }, HAND);
    expect(b).toEqual(["c2", "c4"]);
    expect(mulliganReducer(b, { t: "toggle", iid: "c2" }, HAND)).toEqual(["c4"]);
  });

  it("ignores cards that are not in the hand and drops stale marks", () => {
    expect(mulliganReducer(["c2"], { t: "toggle", iid: "c9" }, HAND)).toEqual(["c2"]);
    expect(mulliganReducer(["c2", "c9"], { t: "toggle", iid: "c1" }, HAND)).toEqual(["c2", "c1"]);
    expect(mulliganReducer(["c2"], { t: "toggle", iid: "c3" }, ["c3"])).toEqual(["c3"]);
  });

  it("clear empties the selection", () => {
    expect(mulliganReducer(["c1", "c3"], { t: "clear" }, HAND)).toEqual([]);
  });

  it("never mutates its input", () => {
    const marked = Object.freeze(["c1"]);
    const hand = Object.freeze([...HAND]);
    expect(() => mulliganReducer(marked, { t: "toggle", iid: "c2" }, hand)).not.toThrow();
    expect(marked).toEqual(["c1"]);
  });

  it("replaceList follows hand order and keeps only hand cards", () => {
    expect(replaceList(["c4", "c1", "c9"], HAND)).toEqual(["c1", "c4"]);
    expect(replaceList([], HAND)).toEqual([]);
    expect(replaceList(HAND, HAND)).toEqual(HAND);
  });
});
