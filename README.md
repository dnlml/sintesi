# YouTube Transcript Summarizer

Questo progetto è un'applicazione Node.js scritta in TypeScript che recupera il transcript di un video YouTube e ne genera un riassunto.

## Prerequisiti

- Node.js (v23 o superiore consigliato per l'esecuzione diretta di `.ts`)
- pnpm (o npm/yarn)

## Installazione

1. Clona il repository:
   ```bash
   git clone <repository-url>
   cd yt-scraper
   ```
2. Installa le dipendenze:
   ```bash
   pnpm install
   ```

## Utilizzo

Per ottenere il riassunto di un video, esegui:

```bash
pnpm start <youtube_video_url>
```

Sostituisci `<youtube_video_url>` con l'URL completo del video YouTube.

**Esempio:**

```bash
pnpm start https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Modalità di sviluppo

Per eseguire l'applicazione in modalità watch (riavvio automatico in caso di modifiche ai file):

```bash
pnpm run dev <youtube_video_url>
```

## Funzionamento

1. L'applicazione prende l'URL del video come argomento da linea di comando.
2. Utilizza la libreria `youtube-transcript` per scaricare il transcript del video.
3. **(Placeholder)** Genera un riassunto mostrando le prime 10 righe del transcript.
4. Stampa il riassunto sulla console.

## Prossimi passi

- Integrare un modello linguistico (LLM) per generare riassunti più accurati e concisi invece del placeholder.
- Aggiungere gestione degli errori più robusta.
- Opzioni per personalizzare la lunghezza del riassunto.
