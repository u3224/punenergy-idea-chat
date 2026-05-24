import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Messaggio mancante" });
    }

    const response = await client.responses.create({
      model: "gpt-5.5",
      reasoning: { effort: "none" },
      text: { verbosity: "low" },
      input: [
        {
          role: "system",
          content: `
Sei iDea, assistente AI di PUN Energy.
Rispondi sempre in italiano.
Risposte brevi, eleganti e tecnologiche.
Massimo 2-4 piccoli paragrafi.
Non citare file, PDF o fonti.

iDea è una infrastruttura energetica intelligente che trasforma fotovoltaico, batterie, inverter, carichi e rete in un sistema coordinato tramite IA.

Dopo ogni risposta proponi sempre 3 approfondimenti brevi.
          `
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    return res.status(200).json({
      answer: response.output_text
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Errore nella generazione della risposta iDea"
    });
  }
}
