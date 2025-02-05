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
                            <img src="https://email-pictures.myfapsheet.com/MyFapSheetLogo.png" width="26" alt="Logo" />
                            <span style="font-weight: 600; font-size: 22px; margin-left: 10px;">MyFapSheet</span>
                        </td>
                    </tr>
                     <tr>
                        <td>
                            <p style="margin:0; margin-top:16px;">Hi ${username},</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="margin:16px 0;">Thank you for signing up. Get ready to create your awesome actor list. Check out the drag and drop picture upload tutorial on our resources page for easy picture uploads.</p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center"> <a href="${process.env.NODE_ENV === 'PRODUCTION' ? process.env.WEBSITE_URL : process.env.DEVELOPMENT_URL}/resources?resourcesButtonEmailClick=true" style="
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
                <p style="margin:16px 0;">Enjoy and thanks for using our service. Please don't hesitate to contact us for any questions.</p>
            </td>
        </tr>
        <tr><td><p style="margin:0px 0">Regards,</p></td></tr>
        <tr><td><p style="margin:16px 0">MyFapSheet</p></td></tr>
        </table>
        </td>
        </tr>
    </table>
`;
  await mg.messages.create("myfapsheet.com", {
    from: "MyFapSheet <noreply@myfapsheet.com>",
    to: [email],
    //to: ["bryanyuen@myfapsheet.com"],
    subject: "Welcome to MyFapSheet",
    text:
      "Hi " +
      username +
      ", Thank you for signing up. We're so excited to have you on board. Check out our resources page to get started:" +
      process.env.DEVELOPMENT_URL +
      "/resources",
    html: htmlContent,
  });
};

export default sendWelcomeEmail;
