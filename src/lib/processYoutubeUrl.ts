#!/usr/bin/env node
import { YoutubeTranscript, type TranscriptResponse } from 'youtube-transcript';
import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs';
import * as dotenv from 'dotenv';
import { promises as fsPromises, createWriteStream as fsCreateWriteStream } from 'fs';
import * as path from 'path';
import ytdl from '@distube/ytdl-core';
import { pipeline } from 'node:stream/promises';

// Load environment variables from .env file
dotenv.config();
const MAX_SUMMARY_LINE_LENGTH_MEDIUM = 30;
const MAX_SUMMARY_LINE_LENGTH_SHORT = 10;
const MAX_SUMMARY_LINE_LENGTH_LONG = 85;

// Check that API keys are present
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY not found in .env file');
  process.exit(1);
}
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found in .env file');
  process.exit(1);
}

// Definizione della mappa per la lunghezza del riassunto
const summaryLengthMap: { [key: string]: number } = {
  short: MAX_SUMMARY_LINE_LENGTH_SHORT,
  medium: MAX_SUMMARY_LINE_LENGTH_MEDIUM,
  long: MAX_SUMMARY_LINE_LENGTH_LONG
};

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: 'org-nSirMan6JeL4Mp8H3pFirXoT'
});

// Initialize ElevenLabs Client
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY
});

async function getTranscript(url: string): Promise<string> {
  try {
    console.log(`Fetching transcript for: ${url}`);
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    // Combine transcript parts into a single string
    const fullTranscript = transcript.map((entry: TranscriptResponse) => entry.text).join(' ');
    console.log('Transcript fetched successfully.');
    return fullTranscript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw new Error('Could not fetch transcript for the provided URL.');
  }
}

async function summarizeTranscript(
  transcript: string,
  description: string,
  language: string,
  summaryLengthValue: number
): Promise<string> {
  console.log(
    `Generating summary using OpenAI in language: ${language} with length value: ${summaryLengthValue}...`
  );

  const languageMap: { [key: string]: string } = {
    it: 'italiano',
    en: 'inglese',
    fr: 'francese',
    es: 'spagnolo',
    de: 'tedesco'
  };
  const targetLanguageName = languageMap[language] || 'italiano';

  const combinedContent = `Descrizione del video:
${description}

Trascrizione:
${transcript}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Sei un assistente esperto nel riassumere video. Il seguente input contiene prima la descrizione del video e poi la sua trascrizione. Crea un riassunto conciso ma informativo **in ${targetLanguageName}**, combinando le informazioni da entrambe le fonti, in massimo ${summaryLengthValue} righe di testo. Il riassunto deve catturare i punti principali e mantenere il tono originale del contenuto.`
        },
        {
          role: 'user',
          content: `Riassumi questo contenuto (descrizione e trascrizione) in massimo ${summaryLengthValue} righe **in ${targetLanguageName}**. Non cominciare con 'In questo video...' o 'In questo video si parla di...', vai direttamente al punto.:\n\n${combinedContent}`
        }
      ],
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      max_tokens: 500
    });

    const summary =
      completion.choices[0]?.message?.content || 'Non è stato possibile generare un riassunto.';
    console.log('Summary generated successfully.');
    return summary;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error generating summary:', error.message);
      throw new Error('Could not generate summary using OpenAI API.');
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
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .toLowerCase();

    return {
      channel: sanitizeForFilename(info.videoDetails.ownerChannelName || 'unknown_channel'),
      title: sanitizeForFilename(info.videoDetails.title || 'unknown_title'),
      description: info.videoDetails.description || ''
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return {
      channel: 'unknown_channel',
      title: 'unknown_title',
      description: ''
    };
  }
}

function cleanDescription(description: string): string {
  // Remove URLs
  let cleaned = description.replace(/https?:\/\/[^\s]+/g, '');

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
    /acquist[a|i] su/gi
    // Add more phrases as needed
  ];
  promoPhrases.forEach((phrase) => {
    cleaned = cleaned.replace(phrase, '');
  });

  // Remove extra whitespace and newlines resulting from replacements
  cleaned = cleaned
    .replace(/\\s{2,}/g, ' ')
    .replace(/(\\r\\n|\\n|\\r){2,}/g, '\n')
    .trim();

  return cleaned;
}

async function readableStreamToBuffer(readableStream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = readableStream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// Function to generate audio summary using ElevenLabs TTS
async function generateAudioSummary({
  summary,
  channel,
  title,
  language,
  speed
}: {
  summary: string;
  channel: string;
  title: string;
  language: string;
  speed: number;
}): Promise<void> {
  console.log(`Generating audio summary using ElevenLabs library in language: ${language}...`);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ElevenLabs API key is missing.');
    return;
  }
  try {
    const summariesDir = path.resolve('./static/summaries');
    await fsPromises.mkdir(summariesDir, { recursive: true });

    const speechFile = path.join(summariesDir, `${channel}-${title}.mp3`);

    const voiceId = 'W71zT1VwIFFx3mMGH2uZ';
    const modelId = 'eleven_turbo_v2_5';
    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: summary,
      model_id: modelId,
      language_code: language,
      voice_settings: {
        speed
      }
    });

    if (Buffer.isBuffer(audio)) {
      await fsPromises.writeFile(speechFile, audio);
      console.log('Audio written as buffer');
    } else if (audio.pipe && typeof audio.pipe === 'function') {
      // Usa stream.pipeline per la gestione asincrona degli stream
      const fileStream = fsCreateWriteStream(speechFile); // Usa l'import rinominato
      await pipeline(audio, fileStream);
      console.log('Audio written as stream');
    } else if (
      audio &&
      typeof (audio as unknown as ReadableStream<Uint8Array>).getReader === 'function'
    ) {
      const buffer = await readableStreamToBuffer(audio as unknown as ReadableStream<Uint8Array>);
      await fsPromises.writeFile(speechFile, buffer);
      console.log('Audio written from ReadableStream');
    } else {
      throw new Error('Unknown audio type returned from ElevenLabs');
    }

    console.log(`Audio summary saved successfully to: ${speechFile}`);
  } catch (error) {
    console.error('Error generating audio summary using ElevenLabs library:', error);
    throw error;
  }
}

export async function processYoutubeUrl(
  videoUrl: string,
  language: string,
  summaryLengthKey: string
): Promise<{ summary: string; audioPath: string }> {
  // Get transcript and metadata (including description)
  const transcript = await getTranscript(videoUrl);
  const { channel, title, description } = await getVideoMetadata(videoUrl); // Get metadata once
  const cleanedDescription = cleanDescription(description);

  const summaryLengthValue = summaryLengthMap[summaryLengthKey] || MAX_SUMMARY_LINE_LENGTH_MEDIUM;

  // Generate summary using transcript and cleaned description
  const summary = await summarizeTranscript(
    transcript,
    cleanedDescription,
    language,
    summaryLengthValue
  );

  await generateAudioSummary({
    summary,
    channel,
    title,
    language,
    speed: 1.0
  });

  return {
    summary,
    audioPath: `/summaries/${channel}-${title}.mp3`
  };
}
