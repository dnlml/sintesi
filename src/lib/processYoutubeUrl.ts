#!/usr/bin/env node
import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs';
import * as dotenv from 'dotenv';
import { promises as fsPromises, createWriteStream as fsCreateWriteStream } from 'fs';
import * as path from 'path';
import ytdl from '@distube/ytdl-core';
import { pipeline } from 'node:stream/promises';
import { uploadFileToS3, generateS3Key, type UploadResult } from './s3Client.js';
import { logEvent, loggers } from './server/logger';

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

// Supported language codes (matching frontend options)
const SUPPORTED_LANGUAGES = ['en', 'it', 'fr', 'es', 'de'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Validate language code
function validateLanguageCode(language: string): SupportedLanguage {
  if (SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
    return language as SupportedLanguage;
  }
  console.warn(`Unsupported language code: ${language}, defaulting to 'en'`);
  return 'en';
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Types for subtitle API responses
interface SubtitleTrack {
  language_code: string;
  url: string;
  label?: string;
}

interface CaptionEntry {
  text: string;
  start?: number;
  dur?: number;
}

async function getTranscript(url: string, preferredLanguage: string = 'it'): Promise<string> {
  try {
    console.log(`Fetching transcript for: ${url} in language: ${preferredLanguage}`);

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    // Updated instance list with better rotation handling
    const instances = [
      'https://yewtu.be',
      'https://inv.nadeko.net',
      'https://id.420129.xyz',
      'https://invidious.nerdvpn.de',
      'https://invidious.f5.si'
    ];

    let lastError: Error | null = null;

    for (const instance of instances) {
      try {
        console.log(`Trying instance: ${instance}`);
        const apiUrl = `${instance}/api/v1/videos/${videoId}/subtitles`;

        const res = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        // Handle rate limiting - continue to next instance
        if (res.status === 429) {
          console.warn(`Rate limited on ${instance}, trying next instance...`);
          continue;
        }

        if (!res.ok) {
          throw new Error(`Instance ${instance} returned ${res.status}`);
        }

        const list = (await res.json()) as SubtitleTrack[];
        if (!Array.isArray(list) || list.length === 0) {
          console.warn(`No subtitles available on ${instance}, trying next instance...`);
          continue; // Try next instance instead of returning empty
        }

        // Enhanced language matching logic
        const findBestLanguageMatch = (
          tracks: SubtitleTrack[],
          targetLang: string
        ): SubtitleTrack | null => {
          // First try exact match
          let match = tracks.find((t) => t.language_code === targetLang);
          if (match) return match;

          // Try with language variants (e.g., 'en' matches 'en-US', 'en-GB')
          match = tracks.find((t) => t.language_code.startsWith(targetLang + '-'));
          if (match) return match;

          // Try partial match (e.g., 'en-US' when looking for 'en')
          match = tracks.find((t) => t.language_code.split('-')[0] === targetLang);
          if (match) return match;

          return null;
        };

        // Find best language match or fallback to first available
        const track = findBestLanguageMatch(list, preferredLanguage) || list[0];

        if (!track || !track.url) {
          throw new Error(`No valid subtitle tracks found on ${instance}`);
        }

        const actualLanguage = track.language_code;
        const isExactMatch = actualLanguage === preferredLanguage;
        const isVariantMatch =
          actualLanguage.startsWith(preferredLanguage + '-') ||
          actualLanguage.split('-')[0] === preferredLanguage;

        if (isExactMatch) {
          console.log(`✓ Found exact language match: ${actualLanguage} from ${instance}`);
        } else if (isVariantMatch) {
          console.log(
            `~ Found language variant: ${actualLanguage} (requested: ${preferredLanguage}) from ${instance}`
          );
        } else {
          console.log(
            `! Using fallback language: ${actualLanguage} (requested: ${preferredLanguage}) from ${instance}`
          );
        }

        const captionsRes = await fetch(track.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!captionsRes.ok) {
          throw new Error(`Failed to fetch subtitle content from ${instance}`);
        }

        const captions = (await captionsRes.json()) as CaptionEntry[];

        // Convert captions to transcript text (similar format to youtube-transcript)
        let fullTranscript = '';
        if (Array.isArray(captions)) {
          fullTranscript = captions.map((entry: CaptionEntry) => entry.text || '').join(' ');
        } else {
          throw new Error('Unexpected captions format');
        }

        if (fullTranscript.trim().length === 0) {
          console.warn(`Empty transcript from ${instance}, trying next instance...`);
          continue; // Try next instance instead of returning empty
        }

        console.log(
          `Transcript fetched successfully via ${instance} (${fullTranscript.length} characters)`
        );
        return fullTranscript;
      } catch (error) {
        console.warn(`Failed to get transcript from ${instance}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // For non-429 errors, we might want to continue trying other instances
        // rather than breaking immediately, depending on the error type
        if (error instanceof Error && error.message.includes('429')) {
          continue; // Rate limit, try next instance
        }
        // For other errors, continue trying other instances as well
        continue;
      }
    }

    // If we get here, all instances failed
    const errorMessage = lastError?.message || 'Unknown error';
    throw new Error(`Unable to fetch transcript from any instance (last error: ${errorMessage})`);
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
}): Promise<{ localPath: string; s3Url?: string }> {
  console.log(`Generating audio summary using ElevenLabs library in language: ${language}...`);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ElevenLabs API key is missing.');
    throw new Error('ElevenLabs API key is missing.');
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

    // Upload to S3
    const s3Key = generateS3Key(channel, title, 'mp3');
    const uploadResult: UploadResult = await uploadFileToS3(speechFile, s3Key);

    if (uploadResult.success) {
      console.log(`Audio uploaded to S3: ${uploadResult.s3Url}`);
      console.log(`Signed URL: ${uploadResult.signedUrl}`);
      return {
        localPath: speechFile,
        s3Url: uploadResult.signedUrl // Use signed URL instead of direct S3 URL
      };
    } else {
      console.warn(`S3 upload failed: ${uploadResult.error}. Using local file.`);
      return {
        localPath: speechFile
      };
    }
  } catch (error) {
    console.error('Error generating audio summary using ElevenLabs library:', error);
    throw error;
  }
}

export async function processYoutubeUrl(
  videoUrl: string,
  language: string,
  summaryLengthKey: string
): Promise<{ summary: string; audioPath: string; s3Url?: string }> {
  const startTime = Date.now();

  // Validate and normalize language code
  const validatedLanguage = validateLanguageCode(language);

  loggers.video.info(
    { url: videoUrl, language: validatedLanguage, summaryLength: summaryLengthKey },
    'Starting video processing'
  );

  try {
    // Get transcript in the requested language and metadata
    // Language parameter flows through: Frontend → getTranscript (subtitle language) → summarizeTranscript (output language) → generateAudioSummary (voice language)
    const transcript = await getTranscript(videoUrl, validatedLanguage);
    const { channel, title, description } = await getVideoMetadata(videoUrl);
    const cleanedDescription = cleanDescription(description);

    const summaryLengthValue = summaryLengthMap[summaryLengthKey] || MAX_SUMMARY_LINE_LENGTH_MEDIUM;

    // Generate summary using transcript and cleaned description
    const summary = await summarizeTranscript(
      transcript,
      cleanedDescription,
      validatedLanguage,
      summaryLengthValue
    );

    const audioResult = await generateAudioSummary({
      summary,
      channel,
      title,
      language: validatedLanguage,
      speed: 1.0
    });

    const duration = Date.now() - startTime;
    logEvent.videoProcessing(videoUrl, validatedLanguage, duration, true);
    loggers.video.info(
      {
        url: videoUrl,
        duration,
        audioPath: audioResult.s3Url || audioResult.localPath
      },
      'Video processing completed successfully'
    );

    return {
      summary,
      audioPath: audioResult.s3Url || `/summaries/${channel}-${title}.mp3`, // This will be the signed URL
      s3Url: audioResult.s3Url // This will also be the signed URL
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logEvent.videoProcessing(videoUrl, validatedLanguage, duration, false, errorMessage);
    loggers.video.error(
      {
        url: videoUrl,
        error: errorMessage,
        duration
      },
      'Video processing failed'
    );

    throw error;
  }
}
