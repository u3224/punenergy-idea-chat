import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
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
Sei integrato in un sito web premium, quindi NON devi fare papiri.

Stile:
- breve
- elegante
- tecnologico
- progressivo
- massimo 2-4 piccoli paragrafi
- niente muri di testo
- niente riferimenti a PDF, file o fonti
- niente tono da manuale tecnico

iDea è una infrastruttura energetica intelligente che trasforma fotovoltaico, batterie, inverter, carichi e rete in un sistema coordinato tramite IA.

iDea può:
- lavorare su impianti esistenti
- integrare batterie senza sostituire necessariamente l’inverter
- ottimizzare autoconsumo e immissioni
- creare Energy Cloud distribuito
- supportare batteria virtuale, flessibilità e servizi energetici evoluti

Dopo ogni risposta, proponi sempre 3 approfondimenti brevi.
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
