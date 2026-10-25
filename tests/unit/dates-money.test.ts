import { describe, expect, it } from "vitest";
import { addDays, dayShift, daysBetween, isIsoDate, localToUtc, todayIn, utcToLocal } from "@/lib/utils/dates";
import { formatMoney, parseAmountToCents, sumCents } from "@/lib/utils/money";
import { BUILTIN_RATES, convertCents } from "@/lib/providers/fx";

describe("dates de voyage", () => {
  it("valide les dates calendaires", () => {
    expect(isIsoDate("2027-02-28")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-13-01")).toBe(false);
  });

  it("compte les jours sans dépendre du fuseau du serveur, y compris au changement d'heure", () => {
    expect(daysBetween("2027-03-27", "2027-03-29")).toBe(2);
    expect(daysBetween("2027-10-30", "2027-11-01")).toBe(2);
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
  });

  it("convertit heure locale ↔ UTC selon le fuseau de l'aéroport", () => {
    const utc = localToUtc("2027-07-01T10:00", "Europe/Paris");
    expect(utc.toISOString()).toBe("2027-07-01T08:00:00.000Z");
    expect(utcToLocal(utc, "Asia/Tokyo")).toBe("2027-07-01T17:00");
  });

  it("détecte l'arrivée le lendemain (+1) en heure locale", () => {
    expect(dayShift("2027-07-01T22:30", "2027-07-02T06:10")).toBe(1);
    expect(dayShift("2027-07-01T08:00", "2027-07-01T10:00")).toBe(0);
  });

  it("donne la date du jour dans un fuseau précis", () => {
    const now = new Date("2027-01-01T23:30:00Z");
    expect(todayIn("Europe/Paris", now)).toBe("2027-01-02");
    expect(todayIn("America/New_York", now)).toBe("2027-01-01");
  });
});

describe("argent", () => {
  it("additionne en centimes entiers", () => {
    expect(sumCents([1999, 1, null, undefined])).toBe(2000);
  });
  it("lit les saisies utilisateur", () => {
    expect(parseAmountToCents("600")).toBe(60000);
    expect(parseAmountToCents("600,50")).toBe(60050);
    expect(parseAmountToCents("")).toBeNull();
  });
  it("formate sans décimales pour les devises sans centimes", () => {
    expect(formatMoney(150000, "JPY").replace(/\s/g, " ")).toMatch(/1 500/);
  });
  it("convertit via l'euro et reste identique dans la même devise", () => {
    expect(convertCents(12345, "EUR", "EUR", BUILTIN_RATES)).toBe(12345);
    const usd = convertCents(10000, "EUR", "USD", BUILTIN_RATES);
    const back = convertCents(usd, "USD", "EUR", BUILTIN_RATES);
    expect(Math.abs(back - 10000)).toBeLessThanOrEqual(1);
  });
});

describe("fichiers statiques", () => {
  it("la carte publique est une copie exacte du référentiel géographique", async () => {
    const fs = await import("node:fs");
    const a = fs.readFileSync("src/data/geo/countries.geo.json");
    const b = fs.readFileSync("public/geo/countries.geo.json");
    expect(a.equals(b)).toBe(true);
  });
});
