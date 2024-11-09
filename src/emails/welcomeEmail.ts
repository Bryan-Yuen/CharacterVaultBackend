import FormData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(FormData);
import 'dotenv/config';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error('MAILGUN_API_KEY environment variable is not defined');
}
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

export const sendWelcomeEmail = async (username : string, email : string) => {
  const htmlContent = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; display:block; font-family: Arial, sans-serif;">
        <tr>
            <td style="padding: 20px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="display: flex; align-items: center;">
                            <img src="https://pub-ee6da315dd594adea480914270692ddd.r2.dev/MyFapSheetLogo.png?1" width="26" alt="Logo" />
                            <span style="font-weight: 600; font-size: 22px; margin-left: 10px;">MyFapSheet</span>
                        </td>
                    </tr>
                     <tr>
                        <td>
                            <p style="margin:0">Hi ${username},</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="margin:16px 0;">Thank you for signing up. We're so excited to have you on board. Check out our resources page to get started:</p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center"> <a href="http://192.168.0.208:3000/resources" style="
              display: inline-block;
              padding: 10px 20px;
              background-color: rgb(24, 119, 201);
              color: white;
              text-decoration: none;
              font-size: 18px;
              border-radius: 5px;
            ">Resources</a></td>
        </tr>
        <tr>
            <td>
                <p style="margin:16px 0;">Enjoy and happy fapping. Please don't hesistate to contact us for about any questions.</p>
            </td>
        </tr>
        </table>
        </td>
        </tr>
    </table>
`;

  await mg.messages.create('myfapsheet.com', {
  	from: "MyFapSheet <noreply@myfapsheet.com>",
  	//to: [email],
    to: ["bryanyuen@myfapsheet.com"],
  	subject: "Welcome to MyFapSheet",
  	text: "Hi " + username + ", Thank you for signing up. We're so excited to have you on board. Check out our resources page to get started:" + "http://192.168.0.208:3000/resources",
  	html: htmlContent
  })
  console.log(email)
}