#!/usr/bin/env node
import { createWriteStream as fsCreateWriteStream, promises as fsPromises } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs';
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

async function getTranscript(url: string, language: string): Promise<string> {
  const OXYLAB_USERNAME = process.env.OXYLAB_USERNAME;
  const OXYLAB_PASSWORD = process.env.OXYLAB_PASSWORD;
  if (!OXYLAB_USERNAME || !OXYLAB_PASSWORD) {
    console.error('Error: OXYLAB_USERNAME or OXYLAB_PASSWORD not found in .env file');
    throw new Error('Missing Oxylab credentials');
  }

  function extractVideoId(youtubeUrl: string): string | null {
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /embed\/([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
      const match = youtubeUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  const body = {
    source: 'youtube_transcript',
    query: videoId,
    context: [
      { key: 'language_code', value: language },
      { key: 'transcript_origin', value: 'auto_generated' }
    ]
  };

  try {
    const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' + Buffer.from(`${OXYLAB_USERNAME}:${OXYLAB_PASSWORD}`).toString('base64')
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Oxylab API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    interface TranscriptRun {
      text: string;
    }
    interface TranscriptSegment {
      transcriptSegmentRenderer?: {
        snippet: {
          runs: TranscriptRun[];
        };
      };
    }
    interface OxylabResponse {
      results?: {
        content?: TranscriptSegment[];
      }[];
    }

    const responseData: OxylabResponse = await response.json();
    const content = responseData?.results?.[0]?.content;

    if (!Array.isArray(content)) {
      console.error(
        'Content in Oxylab response is not an array or is missing. Full response:',
        JSON.stringify(responseData, null, 2)
      );
      throw new Error('Content in Oxylab response is not an array or is missing.');
    }

    const transcript = content
      .filter(
        (
          item
        ): item is {
          transcriptSegmentRenderer: NonNullable<TranscriptSegment['transcriptSegmentRenderer']>;
        } => !!item.transcriptSegmentRenderer
      )
      .flatMap((item) => item.transcriptSegmentRenderer.snippet.runs)
      .map((run) => run.text.replace(/\\n/g, ' ').trim())
      .join(' ')
      .trim();

    if (!transcript) {
      console.error(
        'Could not extract transcript from Oxylab response. Full response:',
        JSON.stringify(responseData, null, 2)
      );
      throw new Error('Could not extract transcript from Oxylab response');
    }

    return transcript;
  } catch (error) {
    console.error('Error in getTranscript:', error);
    throw error;
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
  loggers.video.info(
    { url: videoUrl, language, summaryLength: summaryLengthKey },
    'Starting video processing'
  );

  try {
    // Get transcript and metadata (including description)
    const transcript = await getTranscript(videoUrl, language);
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

    const audioResult = await generateAudioSummary({
      summary,
      channel,
      title,
      language,
      speed: 1.0
    });

    const duration = Date.now() - startTime;
    logEvent.videoProcessing(videoUrl, language, duration, true);
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

    logEvent.videoProcessing(videoUrl, language, duration, false, errorMessage);
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
