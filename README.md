# Sintesi

Transform YouTube Videos into Key Insights with Text and Audio Summaries in a Flash!

## Features

- **Video Summarization**: Input a YouTube video URL and get a concise text summary.
- **Audio Summaries**: Generates an audio version of the summary using AI-powered text-to-speech.
- **Multi-language Support**:
  - Text summaries can be generated in Italian (default), English, French, Spanish, and German.
  - Audio summaries are also generated in the selected language.
- **Customizable Summary Length**: Choose between short, medium, or long summaries to fit your needs.
- **Interactive Web Interface**:
  - Modern UI built with SvelteKit and Tailwind CSS.
  - Custom audio player to listen to the generated audio directly on the page.
  - Download option for the audio summary (MP3 format).
  - Ability to clear current results and start a new summary, with an option to delete the previous audio file from the server.
- **Progressive Enhancement**: The form submission uses SvelteKit's `use:enhance` for a smoother user experience without full page reloads.
- **Test Mode**: Includes a test mode activated by a specific cookie (`auth=4440`) to bypass API calls and return mock data for quick UI testing.

## Tech Stack

- **Framework**: SvelteKit
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Internationalization (i18n)**: ParaglideJS
- **Core Logic**:
  - **Video Transcript**: `youtube-transcript`
  - **Video Metadata**: `@distube/ytdl-core`
  - **Text Summarization**: OpenAI API (GPT-4.1-mini)
  - **Text-to-Speech**: ElevenLabs API
- **Package Manager**: pnpm (preferred)

## Project Setup

1.  **Clone the repository**:

    ```bash
    git clone <your-repository-url>
    cd sintesi
    ```

2.  **Install dependencies**:
    (It's recommended to use pnpm as specified in the project preferences)

    ```bash
    pnpm install
    ```

    Alternatively, if you use npm:

    ```bash
    npm install
    ```

3.  **Set up Environment Variables**:
    Create a `.env` file in the root of the project by copying the example file if one exists (e.g., `.env.example`), or create it manually.
    Add your API keys to the `.env` file:
    ```env
    OPENAI_API_KEY="your_openai_api_key_here"
    ELEVENLABS_API_KEY="your_elevenlabs_api_key_here"
    ```
    - `OPENAI_API_KEY`: Your API key from OpenAI.
    - `ELEVENLABS_API_KEY`: Your API key from ElevenLabs.

## Running the Application

1.  **Start the development server**:

    ```bash
    pnpm dev
    ```

    Or, if using npm:

    ```bash
    npm run dev
    ```

2.  **Open your browser**:
    Navigate to `http://localhost:5173` (or the port specified in your console).

## Usage

1.  Open the application in your web browser.
2.  Paste the YouTube video URL into the input field.
3.  Select the desired "Audio Language" for both the text summary and the audio output.
4.  Choose the "Summary length" (Short, Medium, Long).
5.  Click the "Generate Summary" button.
6.  Wait for the process to complete. The text summary and an audio player will appear.
7.  You can play the audio directly or download the MP3 file.
8.  To summarize another video, click "Create New Summary". You'll be prompted to confirm, as this will clear the current results and (if not in test mode) delete the previously generated audio file from the server.

### Test Mode

To use the test mode (which bypasses API calls and returns predefined data):

1.  Open your browser's developer tools.
2.  Go to the "Application" (or "Storage") tab.
3.  Under "Cookies", find your application's domain (e.g., `http://localhost:5173`).
4.  Add a new cookie:
    - Name: `auth`
    - Value: `4440`
5.  Submit the form. The app will now return a mock summary and audio path after a 3-second delay, and the audio file deletion will be disabled for this mock data.

## API Endpoints

The application uses the following server-side API endpoints:

- `POST /api/summary`:
  - Receives `url`, `language`, and `summaryLength` in the request body.
  - Processes the YouTube video, generates a text summary via OpenAI, and an audio summary via ElevenLabs.
  - Returns a JSON object with `summary` (string) and `audioPath` (string).
- `POST /api/summary/delete`:
  - Receives `filepath` in the JSON request body.
  - Deletes the specified audio file from the `static/summaries/` directory.
  - This endpoint checks for an `auth` cookie; if the value is `4440` (test mode), deletion is prevented.

## File Storage

- Generated audio files (.mp3) are saved in the `static/summaries/` directory.
- The test audio file used with the `auth=4440` cookie is expected to be at `static/summaries_test/test.mp3`.

---

This README provides a good starting point. You can expand it further with sections like "Project Structure", "Contributing", "License", or more detailed API documentation as needed.
