# YouTube Summarizer

This project is a Node.js application written in TypeScript that retrieves the transcript of a YouTube video and generates a summary.

## Prerequisites

- Node.js (v23 or higher recommended for direct execution of `.ts` files)
- pnpm (or npm/yarn)
- A `.env` file in the project root with the following variables:
  - `ELEVENLABS_API_KEY`
  - `OPENAI_API_KEY`

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd yt-scraper
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Usage

To get a summary of a video, run:

```bash
pnpm summarize <youtube_video_url>
```

Replace `<youtube_video_url>` with the full URL of the YouTube video.

**Example:**

```bash
pnpm summarize https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## How it works

1. The application takes the video URL as a command line argument.
2. It uses the `youtube-transcript` library to download the video transcript.
3. **(Placeholder)** Generates a summary by showing the first 10 lines of the transcript.
4. Prints the summary to the console.

## Next steps

- Integrate a language model (LLM) to generate more accurate and concise summaries instead of the placeholder.
- Add more robust error handling.
- Options to customize the summary length.

---

> **Note:** This application is currently localized only in Italian.
