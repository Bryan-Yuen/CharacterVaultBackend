import FormData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(FormData);
import 'dotenv/config';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error('MAILGUN_API_KEY environment variable is not defined');
}
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

// try catch will be done on the resolver side
const sendHomePageContactEmail = async (email : string, message : string) => {
  await mg.messages.create('charactervault.site', {
    from: `Support <support@charactervault.site>`, // Use your email address here
  	to: ["support@charactervault.site"],
  	subject: "Character Contact Message",
  	text: message,
  	html: message,
		'h:Reply-To': `${email}` // This specifies where replies should go (user's email)
  })
}

export default sendHomePageContactEmail;