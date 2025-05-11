#!/usr/bin/env node
import { YoutubeTranscript, type TranscriptResponse } from 'youtube-transcript';
import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import ytdl from '@distube/ytdl-core';

// Load environment variables from .env file
dotenv.config();
const MAX_SUMMARY_LINE_LENGTH = 30;

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

async function summarizeTranscript(transcript: string, description: string): Promise<string> {
  console.log('Generating summary using OpenAI...');

  const combinedContent = `Descrizione del video:
${description}

Trascrizione:
${transcript}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Sei un assistente esperto nel riassumere video. Il seguente input contiene prima la descrizione del video e poi la sua trascrizione. Crea un riassunto conciso ma informativo **in italiano**, combinando le informazioni da entrambe le fonti, in massimo ${MAX_SUMMARY_LINE_LENGTH} righe di testo. Il riassunto deve catturare i punti principali e mantenere il tono originale del contenuto.`
        },
        {
          role: 'user',
          content: `Riassumi questo contenuto (descrizione e trascrizione) in massimo ${MAX_SUMMARY_LINE_LENGTH} righe. Non cominciare con 'In questo video...' o 'In questo video si parla di...', vai direttamente al punto.:\n\n${combinedContent}`
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
async function generateAudioSummary(
  summary: string,
  channel: string,
  title: string
): Promise<void> {
  console.log('Generating audio summary using ElevenLabs library...');
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ElevenLabs API key is missing.');
    return;
  }
  try {
    // Construct filename from provided channel and title
    const speechFile = path.resolve(`./summaries/${channel}-${title}.mp3`);

    const voiceId = 'W71zT1VwIFFx3mMGH2uZ';
    const modelId = 'eleven_turbo_v2_5';
    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: summary,
      model_id: modelId,
      language_code: 'it'
    });

    console.log('audio type:', typeof audio, audio.constructor?.name);

    if (Buffer.isBuffer(audio)) {
      fs.writeFileSync(speechFile, audio);
      console.log('Audio written as buffer');
    } else if (audio.pipe && typeof audio.pipe === 'function') {
      // Fallback: salva lo stream, ma logga se ricevi dati
      const fileStream = fs.createWriteStream(speechFile);
      let receivedData = false;
      audio.on('data', (chunk) => {
        receivedData = true;
        console.log('Received audio chunk of size:', chunk.length);
      });
      audio.pipe(fileStream);
      await new Promise<void>((resolve, reject) => {
        fileStream.on('finish', () => {
          if (!receivedData) {
            reject(new Error('No data received from audio stream'));
          } else {
            resolve();
          }
        });
        fileStream.on('error', reject);
        audio.on('error', reject);
      });
      console.log('Audio written as stream');
    } else if (audio && typeof (audio as any).getReader === 'function') {
      // Probabilmente è un ReadableStream web
      const buffer = await readableStreamToBuffer(audio as unknown as ReadableStream<Uint8Array>);
      fs.writeFileSync(speechFile, buffer);
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
  videoUrl: string
): Promise<{ summary: string; audioPath: string }> {
  // Get transcript and metadata (including description)
  const transcript = await getTranscript(videoUrl);
  const metadata = await getVideoMetadata(videoUrl); // Get metadata once
  const cleanedDescription = cleanDescription(metadata.description);

  // Generate summary using transcript and cleaned description
  const summary = await summarizeTranscript(transcript, cleanedDescription);

  // Pass summary, channel, and title to generateAudioSummary
  await generateAudioSummary(summary, metadata.channel, metadata.title);

  // Return summary and audio file path
  return {
    summary,
    audioPath: `./summaries/${metadata.channel}-${metadata.title}.mp3`
  };
}
