import FormData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(FormData);
import 'dotenv/config';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error('MAILGUN_API_KEY environment variable is not defined');
}
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

export const sendHomePageContactEmail = async (email : string, message : string) => {
  mg.messages.create('myfapsheet.com', {
  	from: email,
  	to: ["support@myfapsheet.com"],
  	subject: "MyFapSheet Contact Message",
  	text: message,
  	html: message
  })
  .then(msg => console.log(msg)) // logs response data
  .catch(err => console.log(err)); // logs any error
}