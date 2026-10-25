import { z } from "zod";

/** Booléen tolérant pour les paramètres d'URL et de formulaire ("true", "1", "on" → vrai ; "false", "0", "" → faux). */
export const zBool = (def = false) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return def;
    if (typeof v === "boolean") return v;
    return ["true", "1", "on", "yes", "oui"].includes(String(v).toLowerCase());
  }, z.boolean());
