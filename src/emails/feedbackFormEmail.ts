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
  const goob = await mg.messages.create('myfapsheet.com', {
    from: `Feedback <feedback@myfapsheet.com>`, // Use your email address here
    to: ["feedback@myfapsheet.com"],
    subject: "MyFapSheet Feedback Message From: " + userName + " " + subject,
    text: message,
    html: message,
    'h:Reply-To': `${email}` // This specifies where replies should go (user's email)
  });
  console.log(goob)
}

export default sendFeedbackEmail;
