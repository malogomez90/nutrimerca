import { promises as fs } from "fs";
import path from "path";

export type FoodRow = {
  nombre: string;
  kcal: number;
  proteinas: number;
  grasas: number;
  carbohidratos: number;
  categoria?: string;
  restricciones: string[];
};

type CsvStats = {
  validRows: number;
  discardedRows: number;
};

type CsvLoadResult = {
  rows: FoodRow[];
  stats: CsvStats;
};

const REQUIRED_ALIASES: Record<string, string[]> = {
  nombre: ["nombre", "titulo", "titulo_normalizado"],
  kcal: ["kcal", "energia_kcal_100g"],
  proteinas: ["proteinas", "proteinas_100g"],
  grasas: ["grasas", "grasas_100g"],
  carbohidratos: ["carbohidratos", "hidratos_100g"],
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current.trim());
  return out;
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

export async function loadFoodsCsv(filePath = "data/foods_dataset_final.csv"): Promise<CsvLoadResult> {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  let content: string;
  try {
    content = await fs.readFile(absolute, "utf8");
  } catch {
    throw new Error("CSV_NOT_FOUND: No se pudo localizar data/foods_dataset_final.csv");
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV_PARSE_ERROR: El CSV no contiene datos suficientes");
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

  const indexes = {
    nombre: findColumnIndex(headers, REQUIRED_ALIASES.nombre),
    kcal: findColumnIndex(headers, REQUIRED_ALIASES.kcal),
    proteinas: findColumnIndex(headers, REQUIRED_ALIASES.proteinas),
    grasas: findColumnIndex(headers, REQUIRED_ALIASES.grasas),
    carbohidratos: findColumnIndex(headers, REQUIRED_ALIASES.carbohidratos),
    categoria: findColumnIndex(headers, ["categoria", "categoria_estimada"]),
    restricciones: findColumnIndex(headers, ["restricciones"]),
  };

  const missing = Object.entries(indexes)
    .filter(([k, v]) => v === -1 && ["nombre", "kcal", "proteinas", "grasas", "carbohidratos"].includes(k))
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`CSV_SCHEMA_INVALID: Faltan columnas mínimas (${missing.join(", ")})`);
  }

  const rows: FoodRow[] = [];
  let discardedRows = 0;

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const nombre = cols[indexes.nombre]?.trim();
    const kcal = toNumber(cols[indexes.kcal]);
    const proteinas = toNumber(cols[indexes.proteinas]);
    const grasas = toNumber(cols[indexes.grasas]);
    const carbohidratos = toNumber(cols[indexes.carbohidratos]);

    if (!nombre || kcal == null || proteinas == null || grasas == null || carbohidratos == null) {
      discardedRows += 1;
      continue;
    }

    const categoria = indexes.categoria >= 0 ? cols[indexes.categoria]?.trim() : undefined;
    const rawRestr = indexes.restricciones >= 0 ? cols[indexes.restricciones] : "";
    const restricciones = rawRestr
      ? rawRestr
          .split(/[;,|]/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
      : [];

    rows.push({
      nombre,
      kcal,
      proteinas,
      grasas,
      carbohidratos,
      categoria,
      restricciones,
    });
  }

  return {
    rows,
    stats: {
      validRows: rows.length,
      discardedRows,
    },
  };
}
