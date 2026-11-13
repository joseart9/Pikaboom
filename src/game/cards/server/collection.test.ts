// Phase 14: the dev memory collection store follows the same contract as Postgres (see collection.db.test.ts).
import { describe } from "vitest";
import { GUEST, HOST } from "../testing/server";
import { defineCollectionStoreTests } from "../testing/collectionSuite";
import { MemoryCollectionStore } from "./collection";

describe("MemoryCollectionStore", () => {
  defineCollectionStoreTests(() => new MemoryCollectionStore(), [HOST, GUEST]);
});
