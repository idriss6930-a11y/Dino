import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { BusinessParams, Offer } from "../economics/unitEconomics";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rate = z.number().min(0).max(1);

const businessSchema = z.object({
  timeZone: z.string().min(1),
  params: z.object({
    vatRegime: z.enum(["franchise", "standard"]),
    vatRate: rate,
    turnoverChargeRate: rate,
    paymentFeePct: rate,
    paymentFeeFixed: z.number().min(0),
    refundRate: rate,
    refundCostRecoveryRate: rate,
    chargebackRate: rate,
    chargebackFee: z.number().min(0),
    otherVariableCostPerOrder: z.number().min(0),
    adVatRecoverable: z.boolean(),
  }),
  fixedCostsMonthly: z.record(z.string(), z.number().min(0)),
});

const offersSchema = z.object({
  offers: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      price: z.number().positive(),
      landedCost: z.number().min(0),
      packagingCost: z.number().min(0).optional(),
      customsPerOrder: z.number().min(0).optional(),
      ecoContribution: z.number().min(0).optional(),
      costStatus: z.enum(["sourcé", "estimé", "à vérifier", "réel"]),
      costNote: z.string().optional(),
    }),
  ),
  cpaScenarios: z.record(z.string(), z.object({ cpa: z.number().positive(), note: z.string() })),
});

export interface BusinessConfig {
  timeZone: string;
  params: BusinessParams;
  fixedCostsMonthly: Record<string, number>;
  fixedCostsMonthlyTotal: number;
}

export type OffersConfig = z.infer<typeof offersSchema> & { offers: (Offer & { costStatus: string; costNote?: string })[] };

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`).join(" ; ");
}

export function parseBusinessConfig(raw: unknown): BusinessConfig {
  const parsed = businessSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Configuration invalide — ${formatIssues(parsed.error)}`);
  const total = Object.values(parsed.data.fixedCostsMonthly).reduce((sum, value) => sum + value, 0);
  return { ...parsed.data, fixedCostsMonthlyTotal: total };
}

export function parseOffersConfig(raw: unknown): OffersConfig {
  const parsed = offersSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Offres invalides — ${formatIssues(parsed.error)}`);
  return parsed.data;
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));

export const loadBusinessConfig = (path = "config/business.fr.json") => parseBusinessConfig(readJson(path));
export const loadOffersConfig = (path = "config/offers.json") => parseOffersConfig(readJson(path));
export const projectPath = (...parts: string[]) => resolve(ROOT, ...parts);
