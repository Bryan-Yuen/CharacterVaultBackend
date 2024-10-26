import FormData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(FormData);
import 'dotenv/config';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error('MAILGUN_API_KEY environment variable is not defined');
}
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

export const sendTest = async (username : string, changePasswordUrl : string) => {
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
                        <td align="center">
                            <h1 style="margin:16px 0; font-size:32px;">Reset your password</h1>
                        </td>
                    </tr>
                     <tr>
                        <td>
                            <p style="margin:0">Hi ${username},</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="margin:16px 0;">We've received a request to reset your password. Click on the button below to proceed:</p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center"> <a href="${changePasswordUrl}" style="
              display: inline-block;
              padding: 10px 20px;
              background-color: rgb(24, 119, 201);
              color: white;
              text-decoration: none;
              font-size: 18px;
              border-radius: 5px;
            ">Reset your password</a></td>
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

  mg.messages.create('myfapsheet.com', {
  	from: "MyFapSheet <noreply@myfapsheet.com>",
  	to: ["bryanyuen@myfapsheet.com"],
  	subject: "Reset password request",
  	text: "Hi " + username + ", we've received a request to reset your password. To process with changing your password, please click this link:" + changePasswordUrl,
  	html: htmlContent
  })
  .then(msg => console.log(msg)) // logs response data
  .catch(err => console.log(err)); // logs any error
}