import { APIContracts, APIControllers } from "authorizenet";
import AppDataSource from "../config/db";
import { UserAccount } from "../entities/UserAccount";
import { Subscription } from "../entities/Subscription";
import { Invoice } from "../entities/Invoice";
import { GraphQLError } from "graphql";
import { sendPaymentErrorCancelSubscriptionEmail } from "../config/mailJet";
import merchantAuthenticationType from "../config/authorize";

// monthly subscription status check right after the billing proccesses around 12:30-2:00AM morning of.
export const checkSubscriptionStatusJob = async (job: any) => {
  console.log("data", job.data);
  console.log(job.data.subscription_start_date);
  if (
    new Date(job.data.subscription_start_date).getFullYear() ===
      new Date().getFullYear() &&
    new Date(job.data.subscription_start_date).getMonth() ===
      new Date().getMonth() &&
    new Date(job.data.subscription_start_date).getDate() ===
      new Date().getDate()
  ) {
    console.log("return early");
    return;
  }

  console.log(job);
  var getRequest = new APIContracts.ARBGetSubscriptionRequest();
  getRequest.setMerchantAuthentication(merchantAuthenticationType);
  getRequest.setSubscriptionId(job.data.authorize_subscription_id);

  console.log(JSON.stringify(getRequest.getJSON(), null, 2));

  var ctrl = new APIControllers.ARBGetSubscriptionController(
    getRequest.getJSON()
  );

  ctrl.execute(async function () {
    var apiResponse = ctrl.getResponse();

    var response = new APIContracts.ARBGetSubscriptionResponse(apiResponse);

    console.log(JSON.stringify(response, null, 2));

    if (response != null) {
      if (
        response.getMessages().getResultCode() ==
        APIContracts.MessageTypeEnum.OK
      ) {
        console.log(
          "Subscription Name : " + response.getSubscription().getName()
        );
        console.log(
          "Message Code : " + response.getMessages().getMessage()[0].getCode()
        );
        console.log(
          "Message Text : " + response.getMessages().getMessage()[0].getText()
        );

        //pseudo code:
        if (response.getSubscription().getStatus() === "suspended") {
          // cancel their subscription immediately
          var cancelRequest = new APIContracts.ARBCancelSubscriptionRequest();
          cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
          cancelRequest.setSubscriptionId(job.data.authorize_subscription_id);

          console.log(JSON.stringify(cancelRequest.getJSON(), null, 2));

          var ctrl2 = new APIControllers.ARBCancelSubscriptionController(
            cancelRequest.getJSON()
          );

          ctrl2.execute(async function () {
            var apiResponse = ctrl2.getResponse();

            var response = new APIContracts.ARBCancelSubscriptionResponse(
              apiResponse
            );

            console.log(JSON.stringify(response, null, 2));

            if (response != null) {
              if (
                response.getMessages().getResultCode() ==
                APIContracts.MessageTypeEnum.OK
              ) {
                console.log(
                  "Message Code : " +
                    response.getMessages().getMessage()[0].getCode()
                );
                console.log(
                  "Message Text : " +
                    response.getMessages().getMessage()[0].getText()
                );

                const userRepository = AppDataSource.getRepository(UserAccount);
                const user = await userRepository.findOneBy({
                  //user_id: 58
                  user_id: job.data.user_id,
                });
                if (!user) {
                  throw new GraphQLError("User is not found.", {
                    extensions: {
                      code: "USER_NOT_FOUND",
                    },
                  });
                }

                const subscriptionRepository =
                  AppDataSource.getRepository(Subscription);
                const subscription = await subscriptionRepository.findOne({
                  where: {
                    user: user,
                  },
                  order: {
                    subscription_id: "DESC", // Ensure that the recipes are ordered by the createdAt column in descending order
                  },
                });
                if (!subscription) {
                  throw new GraphQLError("Subscription not found.", {
                    extensions: {
                      code: "SUBSCRIPTION_NOT_FOUND",
                    },
                  });
                }

                const yesterdayDate = new Date();
                yesterdayDate.setDate(new Date().getDate() - 1);

                subscription.subscription_end_date = yesterdayDate;
                await subscriptionRepository.save(subscription);

                sendPaymentErrorCancelSubscriptionEmail();
              } else {
                console.log(
                  "Result Code: " + response.getMessages().getResultCode()
                );
                console.log(
                  "Error Code: " +
                    response.getMessages().getMessage()[0].getCode()
                );
                console.log(
                  "Error message: " +
                    response.getMessages().getMessage()[0].getText()
                );
              }
            } else {
              console.log("Null Response.");
            }
          });
        } else {
          // add the invoice into database
          console.log("amoount", response.getSubscription().getAmount());
          const userRepository = AppDataSource.getRepository(UserAccount);
          const user = await userRepository.findOneBy({
            user_id: job.data.user_id,
          });
          if (!user) {
            throw new GraphQLError("User not found.", {
              extensions: {
                code: "USER_NOT_FOUND",
              },
            });
          }
          const subscriptionRepository =
            AppDataSource.getRepository(Subscription);
          const subscription = await subscriptionRepository.findOneBy({
            authorize_subscription_id: job.data.authorize_subscription_id,
          });
          if (!subscription) {
            throw new GraphQLError("Subscription not found.", {
              extensions: {
                code: "SUBSCRIPTION_NOT_FOUND",
              },
            });
          }
          const invoiceRepository = AppDataSource.getRepository(Invoice);

          const invoice = new Invoice();

          let startDateDay = new Date().getDate();
          let nextBillingDate;
          if (new Date().getMonth() === 0 && startDateDay > 28) {
            // this get the last day of february to account for february 29th the leap year day
            const secondLastDayOfFebruary =
              new Date(new Date().getFullYear(), 2, 0).getDate() - 1;
            // set end date to 2nd last day of february
            nextBillingDate = new Date(
              new Date().getFullYear(),
              1,
              secondLastDayOfFebruary
            );
            console.log("1st if");
            // this is for months with 31st, get last day of next month
          } else if (startDateDay === 31) {
            const secondLastDayOfNextMonth =
              new Date(
                new Date().getFullYear(),
                (new Date().getMonth() + 1) % 12,
                0
              ).getDate() - 1;
            nextBillingDate = new Date(
              new Date().getFullYear(),
              (new Date().getMonth() + 1) % 12,
              secondLastDayOfNextMonth
            );
            console.log("2nd if");
          } else {
            nextBillingDate = new Date(
              new Date().getFullYear(),
              (new Date().getMonth() + 1) % 12,
              startDateDay - 1
            );
            console.log("3rd if");
          }
          console.log(startDateDay);
          console.log(nextBillingDate);

          invoice.billing_start_date = new Date();
          invoice.billing_end_date = nextBillingDate;
          invoice.billing_total = parseFloat(
            response.getSubscription().getAmount()
          );
          invoice.user = user;
          invoice.subscription = subscription;

          await invoiceRepository.save(invoice);
        }
      } else {
        console.log("Result Code: " + response.getMessages().getResultCode());
        console.log(
          "Error Code: " + response.getMessages().getMessage()[0].getCode()
        );
        console.log(
          "Error message: " + response.getMessages().getMessage()[0].getText()
        );
      }
    } else {
      console.log("Null Response.");
    }
  });
};
