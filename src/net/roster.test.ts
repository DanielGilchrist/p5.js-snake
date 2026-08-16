import { describe, expect, test } from "bun:test";

import * as Players from "../core/players";
import * as Roster from "./roster";

const HOST = "host-id";
const ADA = "ada-id";
const BEN = "ben-id";

describe("who is at the table", () => {
  test("the host holds the first seat and joiners take the next ones", () => {
    const roster = Roster.joined(Roster.joined([HOST], ADA), BEN);

    expect(Roster.seatOf(roster, HOST)).toEqual({ some: true, value: Players.FIRST });
    expect(Roster.seatOf(roster, ADA)).toEqual({ some: true, value: Players.id(1) });
    expect(Roster.seatOf(roster, BEN)).toEqual({ some: true, value: Players.id(2) });
  });

  test("somebody who never joined has no seat", () => {
    expect(Roster.seatOf([HOST], ADA).some).toBe(false);
  });

  test("joining twice does not take a second seat", () => {
    expect(Roster.joined(Roster.joined([HOST], ADA), ADA)).toEqual([HOST, ADA]);
  });

  test("leaving frees the seat and those behind move up", () => {
    const roster = Roster.left([HOST, ADA, BEN], ADA);

    expect(roster).toEqual([HOST, BEN]);
    expect(Roster.seatOf(roster, BEN)).toEqual({ some: true, value: Players.id(1) });
  });
});

describe("sizing the table", () => {
  test("a table seats between two and eight", () => {
    expect(Roster.clamp(1)).toBe(Roster.FEWEST);
    expect(Roster.clamp(0)).toBe(Roster.FEWEST);
    expect(Roster.clamp(9)).toBe(Roster.MOST);
    expect(Roster.clamp(4)).toBe(4);
  });

  test("only the first seats of a crowded room play", () => {
    expect(Roster.seated([HOST, ADA, BEN], 2)).toEqual([HOST, ADA]);
  });

  test("a table with room to spare seats everyone present", () => {
    expect(Roster.seated([HOST, ADA], 6)).toEqual([HOST, ADA]);
  });

  test("the table is full once the seats are taken", () => {
    expect(Roster.full([HOST, ADA], 2)).toBe(true);
    expect(Roster.full([HOST], 2)).toBe(false);
    expect(Roster.full([HOST, ADA], 4)).toBe(false);
  });
});
