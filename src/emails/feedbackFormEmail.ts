import FormData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(FormData);
import 'dotenv/config';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error('MAILGUN_API_KEY environment variable is not defined');
}
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

// try catch will be done on the resolver side
const sendFeedbackEmail = async (email: string, userName: string, subject: string, message: string) => {
  const goob = await mg.messages.create('charactervault.site', {
    from: `Feedback <feedback@charactervault.site>`, // Use your email address here
    to: ["feedback@charactervault.site"],
    subject: "CharacterVault Feedback Message",
    text: `From: ${userName}\nSubject: ${subject}\n\nMessage: ${message}`,
    html: `From: ${userName}<br>Subject: ${subject}<br><br>Message: ${message}`,
    'h:Reply-To': `${email}` // This specifies where replies should go (user's email)
  });
  console.log(goob)
}

export default sendFeedbackEmail;
