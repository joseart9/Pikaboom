// "friendly"/"enemy" (default friendly) relative to the ability's controller → seat.
import { otherSeat } from "../../ids";
import type { Seat } from "../../types";
import type { AbilityContext } from "../context";

export function seatFor(a: AbilityContext, side: "friendly" | "enemy" | undefined): Seat {
  return side === "enemy" ? otherSeat(a.controller) : a.controller;
}
