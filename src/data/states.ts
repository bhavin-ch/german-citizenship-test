export interface StateInfo {
  code: string;
  name: string; // German name
  en: string; // English name
}

/** The 16 German federal states (Bundesländer), matching the question `num` prefixes. */
export const STATES: StateInfo[] = [
  { code: "BW", name: "Baden-Württemberg", en: "Baden-Württemberg" },
  { code: "BY", name: "Bayern", en: "Bavaria" },
  { code: "BE", name: "Berlin", en: "Berlin" },
  { code: "BB", name: "Brandenburg", en: "Brandenburg" },
  { code: "HB", name: "Bremen", en: "Bremen" },
  { code: "HH", name: "Hamburg", en: "Hamburg" },
  { code: "HE", name: "Hessen", en: "Hesse" },
  { code: "MV", name: "Mecklenburg-Vorpommern", en: "Mecklenburg-Western Pomerania" },
  { code: "NI", name: "Niedersachsen", en: "Lower Saxony" },
  { code: "NW", name: "Nordrhein-Westfalen", en: "North Rhine-Westphalia" },
  { code: "RP", name: "Rheinland-Pfalz", en: "Rhineland-Palatinate" },
  { code: "SL", name: "Saarland", en: "Saarland" },
  { code: "SN", name: "Sachsen", en: "Saxony" },
  { code: "ST", name: "Sachsen-Anhalt", en: "Saxony-Anhalt" },
  { code: "SH", name: "Schleswig-Holstein", en: "Schleswig-Holstein" },
  { code: "TH", name: "Thüringen", en: "Thuringia" },
];

export const STATE_BY_CODE: Record<string, StateInfo> = Object.fromEntries(
  STATES.map((s) => [s.code, s])
);
