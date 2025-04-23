import { YoutubeTranscript, TranscriptResponse } from "youtube-transcript";
import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import ytdl from "@distube/ytdl-core";

// Carica le variabili d'ambiente dal file .env
dotenv.config();

// Verifica che le API key siano presenti
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY not found in .env file");
  process.exit(1);
}
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error("Error: ELEVENLABS_API_KEY not found in .env file");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: "org-nSirMan6JeL4Mp8H3pFirXoT",
});

// Initialize ElevenLabs Client
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

async function getTranscript(url: string): Promise<string> {
  try {
    console.log(`Fetching transcript for: ${url}`);
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    // Combine transcript parts into a single string
    const fullTranscript = transcript
      .map((entry: TranscriptResponse) => entry.text)
      .join(" ");
    console.log("Transcript fetched successfully.");
    return fullTranscript;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    throw new Error("Could not fetch transcript for the provided URL.");
  }
}

async function summarizeTranscript(
  transcript: string,
  description: string
): Promise<string> {
  console.log("Generating summary using OpenAI...");

  const combinedContent = `Descrizione del video:
${description}

Trascrizione:
${transcript}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Sei un assistente esperto nel riassumere video. Il seguente input contiene prima la descrizione del video e poi la sua trascrizione. Crea un riassunto conciso ma informativo combinando le informazioni da entrambe le fonti, in massimo 10 righe di testo. Il riassunto deve catturare i punti principali e mantenere il tono originale del contenuto.",
        },
        {
          role: "user",
          content: `Riassumi questo contenuto (descrizione e trascrizione) in massimo 10 righe. Non cominciare con 'In questo video...' o 'In questo video si parla di...', vai direttamente al punto.:\n\n${combinedContent}`,
        },
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary =
      completion.choices[0]?.message?.content ||
      "Non è stato possibile generare un riassunto.";
    console.log("Summary generated successfully.");
    return summary;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error generating summary:", error.message);
      throw new Error("Could not generate summary using OpenAI API.");
    }
    throw error;
  }
}

async function getVideoMetadata(
  url: string
): Promise<{ channel: string; title: string; description: string }> {
  try {
    const info = await ytdl.getInfo(url);

    // Sanitize the filename by removing special characters and spaces
    const sanitizeForFilename = (str: string) =>
      str
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_")
        .toLowerCase();

    return {
      channel: sanitizeForFilename(
        info.videoDetails.ownerChannelName || "unknown_channel"
      ),
      title: sanitizeForFilename(info.videoDetails.title || "unknown_title"),
      description: info.videoDetails.description || "",
    };
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    return {
      channel: "unknown_channel",
      title: "unknown_title",
      description: "",
    };
  }
}

function cleanDescription(description: string): string {
  // Remove URLs
  let cleaned = description.replace(/https?:\/\/[^\s]+/g, "");

  // Remove common promotional phrases (case-insensitive)
  const promoPhrases = [
    /iscriviti al canale/gi,
    /link in descrizione/gi,
    /seguimi su/gi,
    /codice sconto/gi,
    /visita il sito/gi,
    /offerta speciale/gi,
    /supporta il canale/gi,
    /compra qui/gi,
    /acquist[a|i] su/gi,
    // Add more phrases as needed
  ];
  promoPhrases.forEach((phrase) => {
    cleaned = cleaned.replace(phrase, "");
  });

  // Remove extra whitespace and newlines resulting from replacements
  cleaned = cleaned
    .replace(/\\s{2,}/g, " ")
    .replace(/(\\r\\n|\\n|\\r){2,}/g, "\n")
    .trim();

  return cleaned;
}

// Function to generate audio summary using ElevenLabs TTS
async function generateAudioSummary(
  summary: string,
  channel: string,
  title: string
): Promise<void> {
  console.log("Generating audio summary using ElevenLabs library...");
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ElevenLabs API key is missing.");
    return;
  }
  try {
    // Construct filename from provided channel and title
    const speechFile = path.resolve(`./${channel}-${title}.mp3`);

    const voiceId = "W71zT1VwIFFx3mMGH2uZ";
    const modelId = "eleven_multilingual_v2";

    const audioStream = await elevenlabs.generate({
      voice: voiceId,
      text: summary,
      model_id: modelId,
    });

    const fileStream = fs.createWriteStream(speechFile);
    audioStream.pipe(fileStream);

    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", () => resolve());
      fileStream.on("error", reject);
      audioStream.on("error", reject);
    });

    console.log(`Audio summary saved successfully to: ${speechFile}`);
  } catch (error) {
    console.error(
      "Error generating audio summary using ElevenLabs library:",
      error
    );
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: pnpm start <youtube_video_url>");
    process.exit(1);
  }

  const videoUrl = args[0];

  try {
    // Get transcript and metadata (including description)
    const transcript = await getTranscript(videoUrl);
    const metadata = await getVideoMetadata(videoUrl); // Get metadata once
    const cleanedDescription = cleanDescription(metadata.description);

    // Generate summary using transcript and cleaned description
    const summary = await summarizeTranscript(transcript, cleanedDescription);
    console.log("\n--- Video Summary ---\n");
    console.log(summary);
    console.log("\n---------------------\n");

    // Pass summary, channel, and title to generateAudioSummary
    await generateAudioSummary(summary, metadata.channel, metadata.title);
  } catch (error) {
    if (error instanceof Error) {
      console.error("An error occurred:", error.message);
    } else {
      console.error("An unknown error occurred:", error);
    }
    process.exit(1);
  }
}

main();
