import { describe, expect, it } from "vitest";
import {
  GAME_OVER_THRESHOLD,
  addRoundScores,
  computeRoundScores,
  determineFirstRoundStarter,
  getWinners,
  isGameOver,
} from "../src/engine/scoring.js";
import { makeGrid } from "./helpers.js";

describe("determineFirstRoundStarter", () => {
  it("sceglie chi ha il totale più alto tra le due carte iniziali", () => {
    expect(determineFirstRoundStarter([3, 10, 5])).toBe(1);
  });

  it("in caso di parità sceglie l'indice più basso", () => {
    expect(determineFirstRoundStarter([8, 8, 2])).toBe(0);
  });
});

describe("computeRoundScores", () => {
  it("non raddoppia chi chiude se ha il punteggio più basso in solitaria", () => {
    const grids = [makeGrid([[1, 1, 1]]), makeGrid([[9, 9, 9]])];
    const result = computeRoundScores(grids, 0);
    expect(result.scores).toEqual([3, 27]);
    expect(result.doubled).toEqual([false, false]);
  });

  it("raddoppia chi chiude se un altro giocatore ha un punteggio più basso", () => {
    const grids = [makeGrid([[9, 9, 9]]), makeGrid([[1, 1, 1]])];
    const result = computeRoundScores(grids, 0);
    expect(result.scores).toEqual([54, 3]);
    expect(result.doubled).toEqual([true, false]);
  });

  it("raddoppia chi chiude anche in caso di pareggio sul punteggio minimo", () => {
    const grids = [makeGrid([[3, 3, 3]]), makeGrid([[3, 3, 3]])];
    const result = computeRoundScores(grids, 0);
    expect(result.scores).toEqual([18, 9]);
    expect(result.doubled).toEqual([true, false]);
  });
});

describe("addRoundScores / isGameOver / getWinners", () => {
  it("somma i punteggi di manche ai totali", () => {
    expect(addRoundScores([10, 20], [5, 0])).toEqual([15, 20]);
  });

  it("segnala fine partita al raggiungimento della soglia", () => {
    expect(isGameOver([50, 99])).toBe(false);
    expect(isGameOver([50, 100])).toBe(true);
    expect(isGameOver([120, 10])).toBe(true);
    expect(GAME_OVER_THRESHOLD).toBe(100);
  });

  it("individua il vincitore con il totale più basso", () => {
    expect(getWinners([80, 40, 60])).toEqual([1]);
  });

  it("individua più vincitori in caso di parità", () => {
    expect(getWinners([40, 40, 60])).toEqual([0, 1]);
  });
});
