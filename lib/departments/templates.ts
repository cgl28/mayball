export type DepartmentTemplate = {
  name: string;
  code: string;
  displayOrder: number;
};

export const STANDARD_DEPARTMENT_TEMPLATES: DepartmentTemplate[] = [
  { name: "Aesthetics", code: "AE", displayOrder: 1 },
  { name: "Drinks", code: "DR", displayOrder: 2 },
  { name: "Food", code: "FOOD", displayOrder: 3 },
  { name: "Graphics", code: "GR", displayOrder: 4 },
  { name: "Insurance", code: "INS", displayOrder: 5 },
  { name: "Launch", code: "LA", displayOrder: 6 },
  { name: "Lawyers", code: "LAW", displayOrder: 7 },
  { name: "Logistics", code: "LOG", displayOrder: 8 },
  { name: "Musical Ents", code: "ME", displayOrder: 9 },
  { name: "Non-musical Ents", code: "NME", displayOrder: 10 },
  { name: "Personnel", code: "PER", displayOrder: 11 },
  { name: "Production", code: "PROD", displayOrder: 12 },
  { name: "Security", code: "SEC", displayOrder: 13 },
  { name: "Ticketing", code: "TIX", displayOrder: 14 },
  { name: "Web", code: "WEB", displayOrder: 15 },
  { name: "Welfare", code: "WEL", displayOrder: 16 },
];

const DEPARTMENT_COLOURS = [
  "#256f6c",
  "#7a5c1f",
  "#26734d",
  "#6b5ca5",
  "#4f6f9f",
  "#a54f4f",
  "#5f6b2e",
  "#8a5f2d",
  "#34739a",
  "#8f4f78",
  "#526f38",
  "#7b6570",
  "#3f5f7f",
  "#7c6b22",
  "#47706d",
  "#7a5845",
] as const;

const TEMPLATE_COLOUR_INDEX: Record<string, number> = {
  AE: 0,
  DR: 1,
  FOOD: 2,
  GR: 3,
  INS: 4,
  LA: 5,
  LAW: 6,
  LOG: 7,
  ME: 8,
  NME: 9,
  PER: 10,
  PROD: 11,
  SEC: 12,
  TIX: 13,
  WEB: 14,
  WEL: 15,
};

function codeFingerprint(code: string) {
  return code
    .trim()
    .toUpperCase()
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function departmentColourForCode(code: string, displayOrder = 0): string {
  const normalisedCode = code.trim().toUpperCase();
  const mappedIndex = TEMPLATE_COLOUR_INDEX[normalisedCode];
  const paletteIndex =
    mappedIndex ?? Math.abs(codeFingerprint(normalisedCode) + displayOrder);

  return DEPARTMENT_COLOURS[paletteIndex % DEPARTMENT_COLOURS.length];
}

export function missingStandardDepartments(existingCodes: Iterable<string>) {
  const existing = new Set(
    Array.from(existingCodes, (code) => code.trim().toUpperCase()),
  );

  return STANDARD_DEPARTMENT_TEMPLATES.filter(
    (department) => !existing.has(department.code),
  );
}
