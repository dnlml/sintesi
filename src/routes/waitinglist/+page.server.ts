import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return {
        success: false,
        message: 'Please enter a valid email address.'
      };
    }

    // Here you would typically save the email to a database or mailing list
    console.log('Email submitted to server:', email);

    return {
      success: true,
      message: 'Thank you for registering! We will notify you soon.',
      email // Optionally return the email if needed, or clear it on the client
    };
  }
};
