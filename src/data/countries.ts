/** Informations pays utilisées par DINO (noms, continent, devise, fuseau principal). */
export type CountryInfo = { fr: string; en: string; continent: string; currency: string; tz: string };

export const COUNTRIES: Record<string, CountryInfo> = {
  FR: { fr: "France", en: "France", continent: "Europe", currency: "EUR", tz: "Europe/Paris" },
  BE: { fr: "Belgique", en: "Belgium", continent: "Europe", currency: "EUR", tz: "Europe/Brussels" },
  CH: { fr: "Suisse", en: "Switzerland", continent: "Europe", currency: "CHF", tz: "Europe/Zurich" },
  LU: { fr: "Luxembourg", en: "Luxembourg", continent: "Europe", currency: "EUR", tz: "Europe/Luxembourg" },
  PT: { fr: "Portugal", en: "Portugal", continent: "Europe", currency: "EUR", tz: "Europe/Lisbon" },
  ES: { fr: "Espagne", en: "Spain", continent: "Europe", currency: "EUR", tz: "Europe/Madrid" },
  IT: { fr: "Italie", en: "Italy", continent: "Europe", currency: "EUR", tz: "Europe/Rome" },
  GR: { fr: "Grèce", en: "Greece", continent: "Europe", currency: "EUR", tz: "Europe/Athens" },
  TR: { fr: "Turquie", en: "Türkiye", continent: "Asie", currency: "TRY", tz: "Europe/Istanbul" },
  MA: { fr: "Maroc", en: "Morocco", continent: "Afrique", currency: "MAD", tz: "Africa/Casablanca" },
  TN: { fr: "Tunisie", en: "Tunisia", continent: "Afrique", currency: "TND", tz: "Africa/Tunis" },
  DZ: { fr: "Algérie", en: "Algeria", continent: "Afrique", currency: "DZD", tz: "Africa/Algiers" },
  CZ: { fr: "Tchéquie", en: "Czechia", continent: "Europe", currency: "CZK", tz: "Europe/Prague" },
  HU: { fr: "Hongrie", en: "Hungary", continent: "Europe", currency: "HUF", tz: "Europe/Budapest" },
  PL: { fr: "Pologne", en: "Poland", continent: "Europe", currency: "PLN", tz: "Europe/Warsaw" },
  DE: { fr: "Allemagne", en: "Germany", continent: "Europe", currency: "EUR", tz: "Europe/Berlin" },
  AT: { fr: "Autriche", en: "Austria", continent: "Europe", currency: "EUR", tz: "Europe/Vienna" },
  NL: { fr: "Pays-Bas", en: "Netherlands", continent: "Europe", currency: "EUR", tz: "Europe/Amsterdam" },
  GB: { fr: "Royaume-Uni", en: "United Kingdom", continent: "Europe", currency: "GBP", tz: "Europe/London" },
  IE: { fr: "Irlande", en: "Ireland", continent: "Europe", currency: "EUR", tz: "Europe/Dublin" },
  IS: { fr: "Islande", en: "Iceland", continent: "Europe", currency: "ISK", tz: "Atlantic/Reykjavik" },
  NO: { fr: "Norvège", en: "Norway", continent: "Europe", currency: "NOK", tz: "Europe/Oslo" },
  SE: { fr: "Suède", en: "Sweden", continent: "Europe", currency: "SEK", tz: "Europe/Stockholm" },
  FI: { fr: "Finlande", en: "Finland", continent: "Europe", currency: "EUR", tz: "Europe/Helsinki" },
  DK: { fr: "Danemark", en: "Denmark", continent: "Europe", currency: "DKK", tz: "Europe/Copenhagen" },
  AL: { fr: "Albanie", en: "Albania", continent: "Europe", currency: "ALL", tz: "Europe/Tirane" },
  ME: { fr: "Monténégro", en: "Montenegro", continent: "Europe", currency: "EUR", tz: "Europe/Podgorica" },
  HR: { fr: "Croatie", en: "Croatia", continent: "Europe", currency: "EUR", tz: "Europe/Zagreb" },
  SI: { fr: "Slovénie", en: "Slovenia", continent: "Europe", currency: "EUR", tz: "Europe/Ljubljana" },
  GE: { fr: "Géorgie", en: "Georgia", continent: "Asie", currency: "GEL", tz: "Asia/Tbilisi" },
  EG: { fr: "Égypte", en: "Egypt", continent: "Afrique", currency: "EGP", tz: "Africa/Cairo" },
  AE: { fr: "Émirats arabes unis", en: "United Arab Emirates", continent: "Asie", currency: "AED", tz: "Asia/Dubai" },
  OM: { fr: "Oman", en: "Oman", continent: "Asie", currency: "OMR", tz: "Asia/Muscat" },
  JP: { fr: "Japon", en: "Japan", continent: "Asie", currency: "JPY", tz: "Asia/Tokyo" },
  KR: { fr: "Corée du Sud", en: "South Korea", continent: "Asie", currency: "KRW", tz: "Asia/Seoul" },
  CN: { fr: "Chine", en: "China", continent: "Asie", currency: "CNY", tz: "Asia/Shanghai" },
  TH: { fr: "Thaïlande", en: "Thailand", continent: "Asie", currency: "THB", tz: "Asia/Bangkok" },
  ID: { fr: "Indonésie", en: "Indonesia", continent: "Asie", currency: "IDR", tz: "Asia/Jakarta" },
  VN: { fr: "Vietnam", en: "Vietnam", continent: "Asie", currency: "VND", tz: "Asia/Ho_Chi_Minh" },
  SG: { fr: "Singapour", en: "Singapore", continent: "Asie", currency: "SGD", tz: "Asia/Singapore" },
  LK: { fr: "Sri Lanka", en: "Sri Lanka", continent: "Asie", currency: "LKR", tz: "Asia/Colombo" },
  IN: { fr: "Inde", en: "India", continent: "Asie", currency: "INR", tz: "Asia/Kolkata" },
  US: { fr: "États-Unis", en: "United States", continent: "Amérique du Nord", currency: "USD", tz: "America/New_York" },
  CA: { fr: "Canada", en: "Canada", continent: "Amérique du Nord", currency: "CAD", tz: "America/Toronto" },
  MX: { fr: "Mexique", en: "Mexico", continent: "Amérique du Nord", currency: "MXN", tz: "America/Mexico_City" },
  BR: { fr: "Brésil", en: "Brazil", continent: "Amérique du Sud", currency: "BRL", tz: "America/Sao_Paulo" },
  AR: { fr: "Argentine", en: "Argentina", continent: "Amérique du Sud", currency: "ARS", tz: "America/Argentina/Buenos_Aires" },
  PE: { fr: "Pérou", en: "Peru", continent: "Amérique du Sud", currency: "PEN", tz: "America/Lima" },
  ZA: { fr: "Afrique du Sud", en: "South Africa", continent: "Afrique", currency: "ZAR", tz: "Africa/Johannesburg" },
  TZ: { fr: "Tanzanie", en: "Tanzania", continent: "Afrique", currency: "TZS", tz: "Africa/Dar_es_Salaam" },
  SN: { fr: "Sénégal", en: "Senegal", continent: "Afrique", currency: "XOF", tz: "Africa/Dakar" },
  AU: { fr: "Australie", en: "Australia", continent: "Océanie", currency: "AUD", tz: "Australia/Sydney" },
  RE: { fr: "La Réunion", en: "Réunion", continent: "Afrique", currency: "EUR", tz: "Indian/Reunion" },
};

/**
 * Fuseau horaire approximatif d'un aéroport à partir de son pays (et de la longitude pour les grands pays).
 * Utilisé uniquement en mode démonstration : les fournisseurs réels renvoient le fuseau exact.
 */
export function guessTimeZone(countryIso: string, lon: number): string {
  if (countryIso === "US") {
    if (lon < -150) return "Pacific/Honolulu";
    if (lon < -115) return "America/Los_Angeles";
    if (lon < -101) return "America/Denver";
    if (lon < -87) return "America/Chicago";
    return "America/New_York";
  }
  if (countryIso === "CA") {
    if (lon < -114) return "America/Vancouver";
    if (lon < -101) return "America/Edmonton";
    if (lon < -90) return "America/Winnipeg";
    if (lon < -64) return "America/Toronto";
    return "America/Halifax";
  }
  if (countryIso === "AU") {
    if (lon < 129) return "Australia/Perth";
    if (lon < 141) return "Australia/Adelaide";
    return "Australia/Sydney";
  }
  if (countryIso === "BR") return lon < -52 ? "America/Manaus" : "America/Sao_Paulo";
  if (countryIso === "RU") return lon < 40 ? "Europe/Moscow" : lon < 70 ? "Asia/Yekaterinburg" : lon < 100 ? "Asia/Novosibirsk" : "Asia/Vladivostok";
  if (countryIso === "ID") return lon < 112 ? "Asia/Jakarta" : lon < 125 ? "Asia/Makassar" : "Asia/Jayapura";
  if (countryIso === "MX") return lon < -105 ? "America/Mazatlan" : lon > -88 ? "America/Cancun" : "America/Mexico_City";
  if (countryIso === "ES" && lon < -12) return "Atlantic/Canary";
  if (countryIso === "PT" && lon < -20) return "Atlantic/Azores";
  const c = COUNTRIES[countryIso];
  if (c) return c.tz;
  // Repli : fuseau UTC±n déduit de la longitude.
  const off = Math.round(lon / 15);
  return off === 0 ? "UTC" : `Etc/GMT${off > 0 ? "-" : "+"}${Math.abs(off)}`;
}
