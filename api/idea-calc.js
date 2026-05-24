import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import xlsxCalc from "xlsx-calc";

const MODEL_PATH = path.join(
  process.cwd(),
  "models",
  "Modello calcolo  Energy Cloud iDea rev 2026A.xlsx"
);

const SHEET_NAME = "Vantaggio Cliente iDea vs RID";

function setCell(sheet, address, value) {
  if (!sheet[address]) sheet[address] = {};
  sheet[address].v = value;
  sheet[address].t = typeof value === "number" ? "n" : "s";
}

function getCell(sheet, address) {
  const cell = sheet[address];
  if (!cell) return null;
  return cell.v ?? null;
}

function getRow(sheet, rowNumber, startCol = "A", endCol = "N") {

  const out = {};

  const start = XLSX.utils.decode_col(startCol);
  const end = XLSX.utils.decode_col(endCol);

  for (let c = start; c <= end; c++) {

    const col = XLSX.utils.encode_col(c);

    out[col] = getCell(sheet, `${col}${rowNumber}`);

  }

  return out;
}

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito"
    });
  }

  try {

    const body = req.body || {};

    const { type } = body;

    if (!fs.existsSync(MODEL_PATH)) {

      return res.status(500).json({
        error: "Modello Excel non trovato"
      });

    }

    const workbook = XLSX.readFile(MODEL_PATH, {
      cellFormula: true,
      cellNF: true,
      cellStyles: true
    });

    const sheet = workbook.Sheets[SHEET_NAME];

    if (!sheet) {

      return res.status(500).json({
        error: "Foglio Excel non trovato"
      });

    }

    if (type === "no_fv") {

      const {
        consumi_kwh_anno,
        zona,
        potenza_fv_kwp,
        batteria_kwh,
        flessibilita
      } = body;

      const potenzaStimata =
        potenza_fv_kwp || Number(consumi_kwh_anno) / 900;

      setCell(sheet, "A54", "Fotovoltaico NO");
      setCell(sheet, "D54", Number(consumi_kwh_anno));
      setCell(sheet, "G53", Number(potenzaStimata));
      setCell(sheet, "I55", Number(batteria_kwh || 0));
      setCell(sheet, "K54", flessibilita ? "SI" : "NO");
      setCell(sheet, "H54", zona);

    }

    else if (type === "with_fv") {

      const {
        energia_immessa_kwh_anno,
        energia_consumata_kwh_anno,
        potenza_impianto_kwp,
        batteria_kwh,
        flessibilita,
        zona
      } = body;

      setCell(sheet, "A54", "Fotovoltaico SI");
      setCell(sheet, "C56", Number(energia_immessa_kwh_anno));
      setCell(sheet, "E56", Number(energia_consumata_kwh_anno));
      setCell(sheet, "G45", Number(potenza_impianto_kwp));
      setCell(sheet, "I56", Number(batteria_kwh || 0));
      setCell(sheet, "K55", flessibilita ? "SI" : "NO");
      setCell(sheet, "H55", zona);

    }

    try {

      xlsxCalc(workbook);

    } catch (calcError) {

      console.error(calcError);

    }

    const result = {

      type,

      rows: {

        attuale_riga_52: getRow(sheet, 52),

        idea_riga_49: getRow(sheet, 49),

        rid_riga_48: getRow(sheet, 48)

      },

      note:
        "Nota: I calcoli sono effettuati a titolo esemplificativo e sulla base delle condizioni di incentivi presenti al momento del calcolo."

    };

    return res.status(200).json(result);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Errore calcolo Excel iDea"
    });

  }

}
