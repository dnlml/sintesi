import type { Actions } from './$types';
import { promises as fs } from 'fs';
import path from 'path';

const EMAILS_PATH = path.resolve(process.cwd(), 'static', 'emails.json');

export const actions: Actions = {
  default: async ({ request }) => {
    try {
      const formData = await request.formData();
      const email = formData.get('email');

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return {
          success: false,
          message: 'Please enter a valid email address.'
        };
      }

      let emails: { email: string; date: string; counter?: number }[] = [];
      try {
        const data = await fs.readFile(EMAILS_PATH, 'utf-8');
        emails = JSON.parse(data);
      } catch (err) {
        // Se il file non esiste, emails resta []
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }

      const idx = emails.findIndex((e) => e.email.toLowerCase() === email.toLowerCase());
      let counter: number = 1;
      if (idx !== -1) {
        // Email già presente, incremento counter
        const entry = emails[idx];
        if (entry.counter === undefined) {
          entry.counter = 2;
        } else {
          entry.counter++;
        }
        counter = entry.counter;
        emails[idx] = entry;
      } else {
        // Nuova email
        const entry = { email, date: new Date().toISOString(), counter: 1 };
        emails.push(entry);
        counter = 1;
      }
      await fs.writeFile(EMAILS_PATH, JSON.stringify(emails, null, 2), 'utf-8');

      return {
        success: true,
        message:
          idx === -1
            ? 'Thank you for registering! We will notify you soon.'
            : `This email was already registered. Attempt count: ${counter}`,
        email,
        counter
      };
    } catch (err) {
      console.error('Error processing form data:', err);
      return {
        success: false,
        message: 'Internal server error. Please try again later.'
      };
    }
  }
};
