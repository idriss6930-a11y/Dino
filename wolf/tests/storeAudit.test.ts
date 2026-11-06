import { describe, expect, it } from "vitest";
import { auditStore } from "../src/audit/storeAudit";
import { nuitalysAfterFix, nuitalysBeforeFix } from "./fixtures/nuitalysSnapshot";

const codes = (findings: ReturnType<typeof auditStore>) => findings.map((f) => f.code);
const options = { dropshipping: true };

describe("auditStore", () => {
  it("catches the 'livraison incluse' claim contradicted by a paid rate below the product price", () => {
    const finding = auditStore(nuitalysBeforeFix, options).find((f) => f.code === "FREE_SHIPPING_CLAIM_MISMATCH");
    expect(finding?.severity).toBe("critique");
    expect(finding?.message).toContain("7,99");
  });

  it("no longer reports the shipping contradiction after the fix", () => {
    const found = codes(auditStore(nuitalysAfterFix, options));
    expect(found).not.toContain("FREE_SHIPPING_CLAIM_MISMATCH");
    expect(found).not.toContain("UNGUARANTEED_EXPRESS");
  });

  it("flags an express rate the dropshipping supplier cannot guarantee", () => {
    expect(codes(auditStore(nuitalysBeforeFix, options))).toContain("UNGUARANTEED_EXPRESS");
    expect(codes(auditStore(nuitalysBeforeFix, { dropshipping: false }))).not.toContain("UNGUARANTEED_EXPRESS");
  });

  it("flags missing unit costs and zero weights that break profit and shipping reporting", () => {
    const found = codes(auditStore(nuitalysAfterFix, options));
    expect(found).toContain("MISSING_UNIT_COST");
    expect(found).toContain("ZERO_WEIGHT");
  });

  it("flags product pages without the manufacturer details required by the GPSR", () => {
    expect(codes(auditStore(nuitalysAfterFix, options))).toContain("GPSR_INFO_MISSING");
  });

  it("accepts a product page that names the manufacturer and gives safety information", () => {
    const product = nuitalysAfterFix.products[0]!;
    const compliant = {
      ...nuitalysAfterFix,
      products: [
        {
          ...product,
          descriptionHtml: `${product.descriptionHtml}<p>Fabricant : Exemple Co., 1 rue X, Ningbo, Chine. Personne responsable dans l'UE : Exemple SARL, Paris. Avertissements : tenir hors de portée des flammes.</p>`,
        },
      ],
    };
    expect(codes(auditStore(compliant, options))).not.toContain("GPSR_INFO_MISSING");
  });

  it("flags tracked inventory that can artificially sell out a dropshipped product", () => {
    expect(codes(auditStore(nuitalysAfterFix, options))).toContain("TRACKED_INVENTORY_DROPSHIPPING");
  });

  it("finds every mandatory legal page on the real store", () => {
    expect(codes(auditStore(nuitalysAfterFix, options))).not.toContain("MISSING_LEGAL_PAGE");
  });

  it("flags a missing withdrawal page", () => {
    const withoutWithdrawal = { ...nuitalysAfterFix, pages: nuitalysAfterFix.pages.filter((p) => p.handle !== "renoncer") };
    const finding = auditStore(withoutWithdrawal, options).find((f) => f.code === "MISSING_LEGAL_PAGE");
    expect(finding?.severity).toBe("critique");
    expect(finding?.message).toMatch(/rétractation/);
  });

  it("asks for proof of the 30-day lowest price when a strike-through price is shown", () => {
    const product = nuitalysAfterFix.products[0]!;
    const withStrike = {
      ...nuitalysAfterFix,
      products: [{ ...product, variants: [{ ...product.variants[0]!, compareAtPrice: 89 }] }],
    };
    expect(codes(auditStore(withStrike, options))).toContain("STRIKE_THROUGH_PRICE");
  });

  it("flags therapeutic wording that could turn a comfort product into a medical device", () => {
    const product = nuitalysAfterFix.products[0]!;
    const risky = {
      ...nuitalysAfterFix,
      products: [{ ...product, descriptionHtml: "<p>Soulage les douleurs cervicales dès la première nuit.</p>" }],
    };
    expect(codes(auditStore(risky, options))).toContain("MEDICAL_CLAIM");
    expect(codes(auditStore(nuitalysAfterFix, options))).not.toContain("MEDICAL_CLAIM");
  });
});
