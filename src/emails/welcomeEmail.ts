import FormData from "form-data";
import Mailgun from "mailgun.js";
const mailgun = new Mailgun(FormData);
import "dotenv/config";

if (!process.env.MAILGUN_API_KEY) {
  throw new Error("MAILGUN_API_KEY environment variable is not defined");
}
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

const sendWelcomeEmail = async (username: string, email: string) => {
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
                        <td>
                            <p style="margin:0; margin-top:16px;">Hi ${username},</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="margin:16px 0;">Thank you for signing up. Get ready to create your awesome character list.</p>
                        </td>
                    </tr>
        <tr>
            <td>
                <p style="margin:16px 0;">Enjoy and thanks for using our service. Please don't hesitate to contact us for any questions.</p>
            </td>
        </tr>
        <tr><td><p style="margin:0px 0">Regards,</p></td></tr>
        <tr><td><p style="margin:16px 0">Character Vault</p></td></tr>
        </table>
        </td>
        </tr>
    </table>
`;
  await mg.messages.create("charactervault.site", {
    from: "CharacterVault <noreply@charactervault.site>",
    to: [email],
    //to: ["bryanyuen@myfapsheet.com"],
    subject: "Welcome to Character Vault",
    text:
      "Hi " +
      username +
      ", Thank you for signing up. We're so excited to have you on board.",
    html: htmlContent,
  });
};

export default sendWelcomeEmail;
