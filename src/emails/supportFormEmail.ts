import FormData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(FormData);
import 'dotenv/config';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error('MAILGUN_API_KEY environment variable is not defined');
}
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

// try catch will be done on the resolver side
const sendSupportEmail = async (email : string, userName : string, subject : string, message : string) => {
  await mg.messages.create('myfapsheet.com', {
    from: `${userName} <${email}>`,
    //from: "support@myfapsheet.com",
  	to: ["support@myfapsheet.com"],
  	subject: "MyFapSheet Support Message: " + subject,
  	text: message,
  	html: message
  })
}

export default sendSupportEmail;