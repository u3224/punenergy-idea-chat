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
  return sheet[address]?.v ?? null;
}

function euro(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return null;
  return Math.round(Number(v));
}

function buildSummary(sheet) {
  return {
    attuale: {
      nome: getCell(sheet, "A52"),
      consumi_kwh: getCell(sheet, "B52"),
      bolletta_annua: euro(getCell(sheet, "N52"))
    },
    rid: {
      nome: getCell(sheet, "A48"),
      energia_prelevata_kwh: getCell(sheet, "B48"),
      bolletta_lorda: euro(getCell(sheet, "J48")),
      contributo_rid: euro(getCell(sheet, "K48")),
      saldo_annuo: euro(getCell(sheet, "N48"))
    },
    idea: {
      nome: getCell(sheet, "A49"),
      energia_prelevata_kwh: getCell(sheet, "B49"),
      bolletta_lorda: euro(getCell(sheet, "J49")),
      contributo_energy_cloud: euro(getCell(sheet, "H49")),
      contributo_flessibilita: euro(getCell(sheet, "L49")),
      saldo_bolletta: euro(getCell(sheet, "N49")),
      vantaggio_residuo: euro(getCell(sheet, "O49"))
    }
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const body = req.body || {};
    const { type } = body;

    if (!fs.existsSync(MODEL_PATH)) {
      return res.status(500).json({ error: "Modello Excel non trovato" });
    }

    const workbook = XLSX.readFile(MODEL_PATH, {
      cellFormula: true,
      cellNF: true,
      cellStyles: true
    });

    const sheet = workbook.Sheets[SHEET_NAME];

    if (!sheet) {
      return res.status(500).json({ error: "Foglio Excel non trovato" });
    }

    if (type === "no_fv") {
      const {
        consumi_kwh_anno,
        zona,
        potenza_fv_kwp,
        batteria_kwh,
        flessibilita
      } = body;

      if (!consumi_kwh_anno || !zona) {
        return res.status(400).json({
          error: "Servono consumi annui in kWh e zona"
        });
      }

      const potenzaStimata =
        potenza_fv_kwp || Number(consumi_kwh_anno) / 900;

      setCell(sheet, "A54", "Fotovoltaico NO");
      setCell(sheet, "D54", Number(consumi_kwh_anno));
      setCell(sheet, "G53", Number(potenzaStimata));
      setCell(sheet, "I55", Number(batteria_kwh || 0));
      setCell(sheet, "K54", flessibilita ? "Si" : "No");
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

      if (
        !energia_immessa_kwh_anno ||
        !energia_consumata_kwh_anno ||
        !potenza_impianto_kwp ||
        !zona
      ) {
        return res.status(400).json({
          error: "Servono energia immessa, consumi, potenza impianto e zona"
        });
      }

      setCell(sheet, "A54", "Fotovoltaico SI");
      setCell(sheet, "C56", Number(energia_immessa_kwh_anno));
      setCell(sheet, "E56", Number(energia_consumata_kwh_anno));
      setCell(sheet, "G45", Number(potenza_impianto_kwp));
      setCell(sheet, "I56", Number(batteria_kwh || 0));
      setCell(sheet, "K55", flessibilita ? "Si" : "No");
      setCell(sheet, "H55", zona);
    }

    else {
      return res.status(400).json({
        error: "Tipo simulazione non valido"
      });
    }

    try {
      xlsxCalc(workbook);
    } catch (calcError) {
      console.error("Errore ricalcolo Excel:", calcError);
    }

    const summary = buildSummary(sheet);

    return res.status(200).json({
      ok: true,
      type,
      summary,
      message:
        "Simulazione iDea completata con modello operativo Energy Cloud.",
      note:
        "Nota: I calcoli sono effettuati a titolo esemplificativo e sulla base delle condizioni di incentivi presenti al momento del calcolo."
    });

  } catch (error) {
    console.error("Errore calcolo iDea:", error);

    return res.status(500).json({
      error: "Errore nel calcolo Excel iDea"
    });
  }
}
