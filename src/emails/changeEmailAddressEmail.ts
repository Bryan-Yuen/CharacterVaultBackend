import FormData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(FormData);
import 'dotenv/config';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error('MAILGUN_API_KEY environment variable is not defined');
}
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

const sendChangeEmailAddressEmail = async (username : string, email : string, changeEmailUrl : string) => {
  const htmlContent = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; display:block; font-family: Arial, sans-serif;">
        <tr>
            <td style="padding: 20px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="display: flex; align-items: center;">
                            <img src="https://charactervault-email-pictures.charactervault.site/action-icon.svg" width="26" alt="Logo" />
                            <span style="font-weight: 600; font-size: 22px; margin-left: 10px;">Character Vault</span>
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <h1 style="margin:16px 0; font-size:32px;">Change email address</h1>
                        </td>
                    </tr>
                     <tr>
                        <td>
                            <p style="margin:0">Hi ${username},</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="margin:16px 0;">We've received a request to change your email address to this email. Click on the button below to confirm:</p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center"> <a href="${changeEmailUrl}" style="
              display: inline-block;
              padding: 10px 20px;
              background-color: rgb(24, 119, 201);
              color: white;
              text-decoration: none;
              font-size: 18px;
              border-radius: 5px;
            ">Confirm new email</a></td>
        </tr>
        <tr>
            <td>
                <p style="margin:16px 0;">This link will expire in 1 hour. If expired, please request a new one.</p>
                <p style="font-size: 12px; color: #777;">If you didn't request this, please ignore this email.</p>
            </td>
        </tr>
        </table>
        </td>
        </tr>
    </table>
`;

  await mg.messages.create('charactervault.site', {
  	from: "CharacterVault <noreply@charactervault.site>",
      to: [email],
  	//to: ["bryanyuen@myfapsheet.com"],
  	subject: "Change email address request",
  	text: "Hi " + username + ", we've received a request to change your email address. To proceed with changing your email address, please click this link:" + changeEmailUrl,
  	html: htmlContent
  })
}

export default sendChangeEmailAddressEmail;