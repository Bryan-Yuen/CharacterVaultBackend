import { SendEmailV3_1, LibraryResponse, Client } from "node-mailjet";
import 'dotenv/config';
/*
if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable is not defined');
}
if (!process.env.API_SECRET) {
  throw new Error('API_SECRET environment variable is not defined');
}
  */

const mailjet = new Client({
  apiKey: process.env.API_KEY || "bob",
  apiSecret: process.env.API_SECRET || "bob",
});

// will need the user's email address as a variable
export const sendSubscriptionConfirmationEmail = async () => {
  const data: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: "bryanyuen@myfapsheet.com",
        },
        To: [
          {
            Email: "bryanyuen1998@gmail.com",
            //Email: jobData.user_email,
          },
        ],
        Subject:
          "Your MyFapSheet Premium Plan has been activated",
        HTMLPart:
          "<h3>Dear passenger, welcome to Mailjet!</h3><br />May the delivery force be with you!",
        TextPart:
          "Hello, thank you for your purchase of myfapsheet premium",
      },
    ],
  };

  const result: LibraryResponse<SendEmailV3_1.Response> =
    await mailjet
      .post("send", { version: "v3.1" })
      .request(data);

  const { Status } = result.body.Messages[0];
  console.log(Status);
};


// change email address email
export const sendChangeEmailAddressConfirmationEmail = async (changeEmailUrl : string) => {
  const data: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: "bryanyuen@myfapsheet.com",
        },
        To: [
          {
            Email: "bryanyuen1998@gmail.com",
          },
        ],
        Subject: "Change Email Request",
        HTMLPart:
          "Hello please use this link to confirm your changed Email: " + changeEmailUrl,
        TextPart:
        changeEmailUrl,
      },
    ],
  };

  const result: LibraryResponse<SendEmailV3_1.Response> = await mailjet
    .post("send", { version: "v3.1" })
    .request(data);

  const { Status } = result.body.Messages[0];
  console.log(Status);
};

// forgot password change email
export const sendForgotPasswordEmail = async (changePasswordUrl : string) => {
  const data: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: "bryanyuen@myfapsheet.com",
        },
        To: [
          {
            Email: "bryanyuen1998@gmail.com",
          },
        ],
        Subject: "Your email flight plan!",
        HTMLPart:
          "<h3>Dear passenger, welcome to Mailjet!</h3><br />May the delivery force be with you! " + changePasswordUrl,
        TextPart:
          "Dear passenger, welcome to Mailjet! May the delivery force be with you! " + changePasswordUrl,
      },
    ],
  };

  const result: LibraryResponse<SendEmailV3_1.Response> = await mailjet
    .post("send", { version: "v3.1" })
    .request(data);

  const { Status } = result.body.Messages[0];
  console.log(Status);
};

export const sendCancelSubscriptionEmail = async () => {
  const data: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: "bryanyuen@myfapsheet.com",
        },
        To: [
          {
            Email: "bryanyuen1998@gmail.com",
            //Email: jobData.user_email,
          },
        ],
        Subject: "Your plan has been cancelled!",
        HTMLPart:
          "<h3>Dear passenger, welcome to Mailjet!</h3><br />May the delivery force be with you!",
        TextPart:
          "Dear passenger, welcome to Mailjet! May the delivery force be with you!",
      },
    ],
  };

  const result: LibraryResponse<SendEmailV3_1.Response> = await mailjet
    .post("send", { version: "v3.1" })
    .request(data);

  const { Status } = result.body.Messages[0];
  console.log(Status);
};

// cancel email due to payment error from monthly check, usually no funds in credit card or expired
export const sendPaymentErrorCancelSubscriptionEmail = async () => {
  const data: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: "bryanyuen@myfapsheet.com",
        },
        To: [
          {
            Email: "bryanyuen1998@gmail.com",
            //Email: jobData.user_email,
          },
        ],
        Subject: "Subscription cancelled due to payment error!",
        HTMLPart:
          "<h3>Dear passenger, welcome to Mailjet!</h3><br />May the delivery force be with you!",
        TextPart:
          "Hello, your subscription has been cancelled due to a payment error. Please create a new subscription again.",
      },
    ],
  };

  const result: LibraryResponse<SendEmailV3_1.Response> = await mailjet
    .post("send", { version: "v3.1" })
    .request(data);

  const { Status } = result.body.Messages[0];
  console.log(Status);
};

export const sendHomePageContactEmail = async (email : string, message : string) => {
  const data: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: "bryanyuen@myfapsheet.com",
        },
        To: [
          {
            Email: "bryanyuen1998@gmail.com",
            //Email: jobData.user_email,
          },
        ],
        Subject: "Message from: " + email,
        HTMLPart:
        "message is: " + message,
        TextPart:
          "from: " + email + " message is: " + message,
      },
    ],
  };
  console.log("message",message)

  const result: LibraryResponse<SendEmailV3_1.Response> = await mailjet
    .post("send", { version: "v3.1" })
    .request(data);

  const { Status } = result.body.Messages[0];
  console.log(Status);
};

export const sendLoggedInContactEmail = async (email : string, subject : string, message : string) => {
const data: SendEmailV3_1.Body = {
  Messages: [
    {
      From: {
        Email: "bryanyuen@myfapsheet.com",
      },
      To: [
        {
          Email: "bryanyuen1998@gmail.com",
          //Email: jobData.user_email,
        },
      ],
      Subject: "Message from: " + email + " " + subject,
      HTMLPart:
      "message is: " + message,
      TextPart:
        " message is: " + message,
    },
  ],
};
console.log("message",message)

const result: LibraryResponse<SendEmailV3_1.Response> = await mailjet
  .post("send", { version: "v3.1" })
  .request(data);

const { Status } = result.body.Messages[0];
console.log(Status);
};