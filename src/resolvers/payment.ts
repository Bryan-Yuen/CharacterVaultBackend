import { UserAccount } from "../entities/UserAccount";
import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Query,
  UseMiddleware,
} from "type-graphql";
import PaymentInput from "../inputClasses/PaymentInput";
import { APIContracts, APIControllers } from "authorizenet";
import { Subscription } from "../entities/Subscription";
import { PaymentProfile } from "../entities/PaymentProfile";
import { Invoice } from "../entities/Invoice";
import { MyContext } from "../index";
import AppDataSource from "../config/db";
import { GraphQLError } from "graphql";
//import { MoreThan } from "typeorm"
import { registerEnumType } from "type-graphql";
import { SubscriptionInformation } from "../returnTypes/SubscriptionInformation";
import { isAuth } from "../middleware/isAuth";
import { rateLimit } from "../middleware/rateLimit";
import { Queue } from "bullmq";
import { sendSubscriptionConfirmationEmail } from "../config/mailJet";
import merchantAuthenticationType from "../config/authorize";

const bullMQRedisConnectionSettings = {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
};

const cancelSubscriptionQueue = new Queue(
  "cancelSubscriptionQueue",
  bullMQRedisConnectionSettings
);


const checkSubscriptionStatusQueue = new Queue(
  "checkSubscriptionStatusQueue",
  bullMQRedisConnectionSettings
);


enum Subscription_Status {
  ACTIVE_SUBSCRIPTION = "ACTIVE_SUBSCRIPTION",
  NO_SUBSCRIPTION = "NO_SUBSCRIPTION",
  CANCELLING_SUBSCRIPTION = "CANCELLING_SUBSCRIPTION",
}

registerEnumType(Subscription_Status, {
  name: "Subscription_Status", // Mandatory
  description: "subscription states", // Optional
});

@Resolver(UserAccount)
export class PaymentResolver {
  /////////////////////////////////////////////////

  @Mutation(() => Boolean)
  async test(): Promise<Boolean> {
    const counts = await cancelSubscriptionQueue.getJobCounts(
      "wait",
      "completed",
      "failed",
      "delayed"
    );
    console.log(counts);
    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  // 10 tries a day incase they got credit card issues
  //@UseMiddleware(rateLimit(10, 60 * 60 * 24))
  async payment(
    @Arg("payment") payment: PaymentInput,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
      if (!payment) console.log(payment, req);

      console.log(payment.expirationDate);

      console.log("expirrrrrrrrr", payment.expirationDate.split("/").join(""));
      var creditCard = new APIContracts.CreditCardType();
      creditCard.setCardNumber(payment.cardNumber);
      creditCard.setExpirationDate(payment.expirationDate.split("/").join(""));
      creditCard.setCardCode(payment.securityCode);

      /*
        var creditCard = new APIContracts.CreditCardType();
        creditCard.setExpirationDate('2039-12');
        creditCard.setCardNumber('370000000000002');
        creditCard.setCardCode("123");
        */

      var paymentType = new APIContracts.PaymentType();
      paymentType.setCreditCard(creditCard);

      var orderDetails = new APIContracts.OrderType();
      orderDetails.setInvoiceNumber("INV-12345");
      orderDetails.setDescription("Product Description");

      var tax = new APIContracts.ExtendedAmountType();
      tax.setAmount("0.00");
      tax.setName("No Tax");
      tax.setDescription("No tax for now until threshold");

      var billTo = new APIContracts.CustomerAddressType();
      billTo.setZip(payment.zipCode);
      billTo.setCountry("USA");

      var transactionRequestType = new APIContracts.TransactionRequestType();
      transactionRequestType.setTransactionType(
        APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
      );
      transactionRequestType.setPayment(paymentType);
      transactionRequestType.setAmount("3.99");
      transactionRequestType.setOrder(orderDetails);
      transactionRequestType.setTax(tax);
      transactionRequestType.setBillTo(billTo);

      var createRequest = new APIContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(merchantAuthenticationType);
      createRequest.setTransactionRequest(transactionRequestType);

      //pretty print request
      console.log(JSON.stringify(createRequest.getJSON(), null, 2));

      var ctrl = new APIControllers.CreateTransactionController(
        createRequest.getJSON()
      );

      return new Promise((resolve) => {
      ctrl.execute(async function () {
        console.log("im on top of api call")
        var apiResponse = ctrl.getResponse();
        console.log("im under of api call")
        var response = new APIContracts.CreateTransactionResponse(apiResponse);

        //pretty print response
        console.log(JSON.stringify(response, null, 2));

        if (response != null) {
          if (
            response.getMessages().getResultCode() ==
            APIContracts.MessageTypeEnum.OK
          ) {
            if (response.getTransactionResponse().getMessages() != null) {
              console.log(
                "Successfully created transaction with Transaction ID: " +
                  response.getTransactionResponse().getTransId()
              );
              console.log(
                "Response Code: " +
                  response.getTransactionResponse().getResponseCode()
              );
              console.log(
                "Message Code: " +
                  response
                    .getTransactionResponse()
                    .getMessages()
                    .getMessage()[0]
                    .getCode()
              );
              console.log(
                "Description: " +
                  response
                    .getTransactionResponse()
                    .getMessages()
                    .getMessage()[0]
                    .getDescription()
              );






              const userRepository = AppDataSource.getRepository(UserAccount);
              const user = await userRepository.findOneBy({
                user_id: req.session.userId,
              });
              if (!user) {
                throw new GraphQLError("User not found.", {
                  extensions: {
                    code: "USER_NOT_FOUND",
                  },
                });
              }
      
              var interval = new APIContracts.PaymentScheduleType.Interval();
              interval.setLength(1);
              interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.MONTHS);
      
              // NEED TO SET 1 MONTH TRIAL FOR NO PAYMENT
              var paymentScheduleType = new APIContracts.PaymentScheduleType();
              paymentScheduleType.setInterval(interval);
              const startDate = new Date();
              const formattedStartDate = startDate.toISOString().split("T")[0]; // Get only the date part in YYYY-MM-DD format
              paymentScheduleType.setStartDate(formattedStartDate);
              paymentScheduleType.setTotalOccurrences(9999);
      
              //credit card data already on top
              var customer = new APIContracts.CustomerType();
              customer.setType(APIContracts.CustomerTypeEnum.INDIVIDUAL);
              customer.setId(user.user_id);
              customer.setEmail(user.user_email);
      
              var nameAndAddressType = new APIContracts.NameAndAddressType();
              nameAndAddressType.setFirstName("n/a");
              nameAndAddressType.setLastName("n/a");
              nameAndAddressType.setZip(payment.zipCode);
              nameAndAddressType.setCountry("USA");
      
              var arbSubscription = new APIContracts.ARBSubscriptionType();
              arbSubscription.setName("MyFapSheet Monthly Subscription");
              arbSubscription.setPaymentSchedule(paymentScheduleType);
              arbSubscription.setAmount("3.99");
              arbSubscription.setPayment(paymentType);
              arbSubscription.setOrder(orderDetails);
              arbSubscription.setCustomer(customer);
              arbSubscription.setBillTo(nameAndAddressType);
              //arbSubscription.setShipTo(nameAndAddressType);
      
              var createRequest =
                new APIContracts.ARBCreateSubscriptionRequest();
              createRequest.setMerchantAuthentication(
                merchantAuthenticationType
              );
              createRequest.setSubscription(arbSubscription);
      
              console.log(JSON.stringify(createRequest.getJSON(), null, 2));
      
              var ctrl2 = new APIControllers.ARBCreateSubscriptionController(
                createRequest.getJSON()
              );
      
              await new Promise<void>((resolveInner) => {
              ctrl2.execute(async function () {
                var apiResponse = await ctrl2.getResponse();
      
                var response = new APIContracts.ARBCreateSubscriptionResponse(
                  apiResponse
                );
      
                console.log(JSON.stringify(response, null, 2));
      
                if (response != null) {
                  if (
                    response.getMessages().getResultCode() ==
                    APIContracts.MessageTypeEnum.OK
                  ) {
                    console.log(response);
                    console.log(response.profile.customerProfileId);
                    console.log(
                      "Subscription Id : " + response.getSubscriptionId()
                    );
                    console.log(
                      "Message Code : " +
                        response.getMessages().getMessage()[0].getCode()
                    );
                    console.log(
                      "Message Text : " +
                        response.getMessages().getMessage()[0].getText()
                    );
      
                    







                    console.log("im inside on top of 2nd callback")
                    const subscriptionRepository =
                      AppDataSource.getRepository(Subscription);
      
                    const subscription = new Subscription();
      
                    subscription.subscription_start_date = new Date();
                    subscription.subscription_end_date = new Date("12-31-9999");
                    subscription.billing_zip = "33027";
                    subscription.authorize_subscription_id =
                      response.subscriptionId;
                    subscription.user = user;
      
                    /*
                      const userRepository = AppDataSource.getRepository(UserAccount);
                      const user = await userRepository.findOneBy({
                        user_id: req.session.userId,
                      });
                      if (user == null) {
                        throw new GraphQLError('User not found.', {
                          extensions: {
                            code: 'USER_NOT_FOUND',
                          },
                        });
                      } else {
                        subscription.user = user;
                      }
                      */
      
                    const saveSubscription = await subscriptionRepository.save(
                      subscription
                    );
                    console.log(saveSubscription);
      
                    const paymentProfileRepository =
                      AppDataSource.getRepository(PaymentProfile);
                    const paymentProfileExists =
                      await paymentProfileRepository.findOneBy({
                        user: user,
                      });
                    //if (paymentProfileExists)
                    if (paymentProfileExists) {
                      paymentProfileExists.authorize_customer_profile_id =
                        response.profile.customerProfileId;
                      paymentProfileExists.authorize_customer_payment_id =
                        response.profile.customerPaymentProfileId;
                      paymentProfileExists.last_4_credit_card_number =
                        payment.cardNumber.slice(-4);
                      paymentProfileExists.user = user;
      
                      const savePaymentProfile =
                        await paymentProfileRepository.save(
                          paymentProfileExists
                        );
                      console.log(savePaymentProfile);
                    } else {
                      const paymentProfile = new PaymentProfile();
      
                      paymentProfile.authorize_customer_profile_id =
                        response.profile.customerProfileId;
                      paymentProfile.authorize_customer_payment_id =
                        response.profile.customerPaymentProfileId;
                      paymentProfile.last_4_credit_card_number =
                        payment.cardNumber.slice(-4);
                      paymentProfile.user = user;
      
                      const savePaymentProfile =
                        await paymentProfileRepository.save(paymentProfile);
                      console.log(savePaymentProfile);
                    }
      
                    // so somewhere around here we need to add the invoice and also send the confirmation email to the customer
                    const invoiceRepository =
                      AppDataSource.getRepository(Invoice);
      
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
                    invoice.billing_total = 3.99;
                    invoice.user = user;
                    invoice.subscription = saveSubscription;
      
                    await invoiceRepository.save(invoice);
      
                    // consider having variables 
                    sendSubscriptionConfirmationEmail();
      
                    //const dayOfMonth = startDate.getDate(); // Assuming `startDate` is a `Date` object representing today's date
      
                    console.log(
                      "subauthorizeid",
                      subscription.authorize_subscription_id
                    );
                    await checkSubscriptionStatusQueue.add(
                      "job name2",
                      {
                        user_email: user.user_email,
                        user_id: req.session.userId,
                        authorize_subscription_id:
                          subscription.authorize_subscription_id,
                        subscription_start_date:
                          subscription.subscription_start_date,
                      },
                      {
                        jobId: "y" + subscription.authorize_subscription_id,
                        delay: 10000,
                        /*
                          repeat: {
                            // Run at 6:00 AM on the `dayOfMonth` day of every month or last of every month if start day is 29, 30, or 31
                            //pattern: startDate.getDate() < 28 ? `0 0 6 ${dayOfMonth} * *` : '0 0 6 L * *',
                            pattern: startDate.getDate() < 28 ? `49 23 ${dayOfMonth} * *` : '26 23 L * *',
                          } 
                          */
                      }
                    );
                    resolveInner()











                    //return true;
                  } else{
                    console.log('Result Code: ' + response.getMessages().getResultCode());
                    console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
                    console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
                  }
                }
                else{
                  console.log('Null Response.');
                }
              });
            });





            








            } else {
              console.log("Failed Transaction.");
              if (response.getTransactionResponse().getErrors() != null) {
                console.log(
                  "Error Code: " +
                    response
                      .getTransactionResponse()
                      .getErrors()
                      .getError()[0]
                      .getErrorCode()
                );
                console.log(
                  "Error message: " +
                    response
                      .getTransactionResponse()
                      .getErrors()
                      .getError()[0]
                      .getErrorText()
                );
              }
            }
          } else {
            console.log("Failed Transaction. ");
            if (
              response.getTransactionResponse() != null &&
              response.getTransactionResponse().getErrors() != null
            ) {
              console.log(
                "Error Code: " +
                  response
                    .getTransactionResponse()
                    .getErrors()
                    .getError()[0]
                    .getErrorCode()
              );
              console.log(
                "Error message: " +
                  response
                    .getTransactionResponse()
                    .getErrors()
                    .getError()[0]
                    .getErrorText()
              );
            } else {
              console.log(
                "Error Code: " +
                  response.getMessages().getMessage()[0].getCode()
              );
              console.log(
                "Error message: " +
                  response.getMessages().getMessage()[0].getText()
              );
            }
          }
        } else {
          console.log("Null Response.");
        }
        //return false;
































       




























        console.log("im at the callback spot")
        resolve(true)
      });
    });
      //console.log("im at the end of payment, if i get here i failed");
      // return false;
  }

  /* ************************************************************************************************************************* */

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async checkProfile(@Ctx() { req }: MyContext): Promise<Boolean> {
    try {
      console.log(!req)
      var getRequest = new APIContracts.GetCustomerPaymentProfileRequest();
      getRequest.setMerchantAuthentication(merchantAuthenticationType);
      getRequest.setCustomerProfileId("918200409");
      getRequest.setCustomerPaymentProfileId("917675104");

      //pretty print request
      //console.log(JSON.stringify(getRequest.getJSON(), null, 2));

      var ctrl = new APIControllers.GetCustomerProfileController(
        getRequest.getJSON()
      );

      ctrl.execute(function () {
        var apiResponse = ctrl.getResponse();

        var response = new APIContracts.GetCustomerPaymentProfileResponse(
          apiResponse
        );

        //pretty print response
        //console.log(JSON.stringify(response, null, 2));

        if (response != null) {
          if (
            response.getMessages().getResultCode() ==
            APIContracts.MessageTypeEnum.OK
          ) {
            console.log(
              "Customer Payment Profile ID : " +
                response.getPaymentProfile().getCustomerPaymentProfileId()
            );
            console.log(
              "Customer Name : " +
                response.getPaymentProfile().getBillTo().getFirstName() +
                " " +
                response.getPaymentProfile().getBillTo().getLastName()
            );
            console.log(
              "Address : " +
                response.getPaymentProfile().getBillTo().getAddress()
            );
            console.log(response);
          } else {
            //console.log('Result Code: ' + response.getMessages().getResultCode());
            console.log(
              "Error Code: " + response.getMessages().getMessage()[0].getCode()
            );
            console.log(
              "Error message: " +
                response.getMessages().getMessage()[0].getText()
            );
          }
        } else {
          console.log("Null response received");
        }
      });
      return false;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(10, 60 * 60 * 24))
  async cancelSubscription(@Ctx() { req }: MyContext): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        //user_id: 58
        user_id: req.session.userId,
      });
      if (!user) {
        throw new GraphQLError("User is not found.", {
          extensions: {
            code: "USER_NOT_FOUND",
          },
        });
      }

      const subscriptionRepository = AppDataSource.getRepository(Subscription);
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

      const startDateDay = subscription.subscription_start_date.getDate();

      const currentDateDay = new Date().getDate();
      let endDate;
      // set it to the day before 11:55PM
      if (startDateDay <= currentDateDay) {
        // if user is cancelling in january 31, 30, or 29
        if (new Date().getMonth() === 0 && startDateDay > 28) {
          // this get the last day of february to account for february 29th the leap year day
          const lastDayOfFebruary = new Date(
            new Date().getFullYear(),
            2,
            0
          ).getDate();
          // set end date to 2nd last day of february
          endDate = new Date(
            new Date().getFullYear(),
            1,
            lastDayOfFebruary - 1
          );
        } else
          endDate = new Date(
            new Date().getFullYear(),
            (new Date().getMonth() + 1) % 12,
            startDateDay - 1
          );
      } else {
        endDate = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          startDateDay - 1
        );
      }
      endDate.setHours(23, 55, 0); // Sets the time to 11:55PM

      const currentTime = new Date();
      let delayMS = endDate.getTime() - currentTime.getTime(); // Difference in milliseconds

      //testing time 15 minutes
      //delayMS = 900000;
      const currentDate = new Date();
      console.log("current time", new Date().getTime());
      console.log(endDate);
      console.log(delayMS);
      console.log(new Date(currentDate.getTime() + delayMS).toLocaleString());
      console.log(subscription.authorize_subscription_id);

      // temporarily change date
      subscription.subscription_end_date = endDate;
      await subscriptionRepository.save(subscription);

      //custom JobID must not be integer so I add a letter before it to get around it
      await cancelSubscriptionQueue.add(
        "job name",
        {
          user_email: user.user_email,
          subscription_id: subscription.authorize_subscription_id,
        },
        {
          jobId: "x" + subscription.authorize_subscription_id,
          delay: 10000,
          //delay: delayMS
        }
      );
      console.log("job added");

      return false;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  @Query(() => SubscriptionInformation)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 6))
  async checkSubscription(
    @Ctx() { req }: MyContext
  ): Promise<SubscriptionInformation> {
    try {
      if (!req) console.log(req);
      console.log("im in check subscription, i've been fetched");
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const paymentProfileRepository =
        AppDataSource.getRepository(PaymentProfile);
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOne({
        where: {
          //user_id: 58
          user_id: req.session.userId,
        },
        relations: ["pornstars"],
      });
      if (!user) {
        throw new GraphQLError("User is not found.", {
          extensions: {
            code: "USER_NOT_FOUND",
          },
        });
      }
      console.log(user.pornstars.length);
      /*
          const subscription = await subscriptionRepository.findOneBy({
            user: user,
            subscription_end_date: MoreThan(new Date())
          });
          */
      const subscription = await subscriptionRepository.findOne({
        where: {
          user: user,
        },
        order: {
          subscription_id: "DESC", // Ensure that the recipes are ordered by the createdAt column in descending order
        },
      });
      console.log(subscription);
      if (!subscription) {
        return {
          subscription_status: Subscription_Status.NO_SUBSCRIPTION,
          number_of_pornstars: user.pornstars.length,
        };
      }
      console.log(new Date("12-31-9999"));

      const paymentProfile = await paymentProfileRepository.findOneBy({
        user: user,
      });
      if (!paymentProfile) {
        throw new GraphQLError("Payment Profile not found.", {
          extensions: {
            code: "PAYMENT_PROFILE_NOT_FOUND",
          },
        });
      }
      // so different formats give different 5:00 or 0:00 ("9999-12-31")
      if (
        subscription.subscription_end_date.getTime() ===
        new Date("12-31-9999").getTime()
      ) {
        const startDateDay = subscription.subscription_start_date.getDate();

        const currentDateDay = new Date().getDate();
        let nextBillingDate;
        if (startDateDay <= currentDateDay) {
          // if user is cancelling in january 31, 30, or 29
          if (new Date().getMonth() === 0 && startDateDay > 28) {
            // this get the last day of february to account for february 29th the leap year day
            const lastDayOfFebruary = new Date(
              new Date().getFullYear(),
              2,
              0
            ).getDate();
            // set end date to 2nd last day of february
            nextBillingDate = new Date(
              new Date().getFullYear(),
              1,
              lastDayOfFebruary
            );
            // this is for months with 31st, get last day of next month
          } else if (startDateDay === 31) {
            nextBillingDate = new Date(
              new Date().getFullYear(),
              (new Date().getMonth() + 2) % 12,
              0
            );
          } else
            nextBillingDate = new Date(
              new Date().getFullYear(),
              (new Date().getMonth() + 1) % 12,
              startDateDay
            );
        } else {
          nextBillingDate = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            startDateDay
          );
        }
        console.log("im in end of checksbuscription");

        return {
          subscription_status: Subscription_Status.ACTIVE_SUBSCRIPTION,
          number_of_pornstars: user.pornstars.length,
          user_last_four_credit_card_number:
            paymentProfile.last_4_credit_card_number,
          subscription_next_billing_date: nextBillingDate,
        };
      } else
        return {
          subscription_status: Subscription_Status.CANCELLING_SUBSCRIPTION,
          number_of_pornstars: user.pornstars.length,
          user_last_four_credit_card_number:
            paymentProfile.last_4_credit_card_number,
          subscription_end_date: subscription.subscription_end_date,
        };
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  //maybe return the last 4 digits of card number and have the number be dynamic on user end and update it there
  // might be problem if user exits page and comes back, so maybe just refresh query
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  // 10 tries a day, after that contact support or wait tomorrow
  @UseMiddleware(rateLimit(10, 60 * 60 * 24))
  async UpdateCreditCard(
    @Arg("payment") payment: PaymentInput,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      if (!merchantAuthenticationType) console.log(payment, req);
      var creditCard = new APIContracts.CreditCardType();
      creditCard.setCardNumber(payment.cardNumber);
      creditCard.setExpirationDate(payment.expirationDate.split("/").join(""));
      creditCard.setCardCode(payment.securityCode);
      console.log("pay", payment);

      var paymentType = new APIContracts.PaymentType();
      paymentType.setCreditCard(creditCard);

      var billTo = new APIContracts.CustomerAddressType();

      billTo.setZip(payment.zipCode);
      // it seems that address is required for updating but not for inserting. weird.
      billTo.setAddress("n/a");
      billTo.setCountry("USA");
      billTo.setFirstName("n/a");
      billTo.setLastName("n/a");

      var customerForUpdate = new APIContracts.CustomerPaymentProfileExType();
      customerForUpdate.setPayment(paymentType);
      //customerForUpdate.setDefaultPaymentProfile(true);
      const paymentProfileRepository =
        AppDataSource.getRepository(PaymentProfile);
      const userRepository = AppDataSource.getRepository(UserAccount);

      const user = await userRepository.findOneBy({
        //user_id: 57,
        user_id: req.session.userId,
      });
      if (!user) {
        throw new GraphQLError("User is not found.", {
          extensions: {
            code: "USER_NOT_FOUND",
          },
        });
      }
      const paymentProfile = await paymentProfileRepository.findOneBy({
        user: user,
      });
      if (!paymentProfile) {
        throw new GraphQLError("Payment Profile not found.", {
          extensions: {
            code: "PAYMENT_PROFILE_NOT_FOUND",
          },
        });
      }

      console.log("gob", paymentProfile);

      customerForUpdate.setCustomerPaymentProfileId(
        paymentProfile.authorize_customer_payment_id
      );
      customerForUpdate.setBillTo(billTo);

      var updateRequest =
        new APIContracts.UpdateCustomerPaymentProfileRequest();
      updateRequest.setMerchantAuthentication(merchantAuthenticationType);
      updateRequest.setCustomerProfileId(
        paymentProfile.authorize_customer_profile_id
      );
      updateRequest.setPaymentProfile(customerForUpdate);
      updateRequest.setValidationMode(APIContracts.ValidationModeEnum.LIVEMODE);

      //pretty print request
      console.log(JSON.stringify(updateRequest.getJSON(), null, 2));

      var ctrl = new APIControllers.UpdateCustomerPaymentProfileController(
        updateRequest.getJSON()
      );

      ctrl.execute(async function () {
        var apiResponse = ctrl.getResponse();

        var response = new APIContracts.UpdateCustomerPaymentProfileResponse(
          apiResponse
        );

        //pretty print response
        //console.log(JSON.stringify(response, null, 2));

        if (response != null) {
          if (
            response.getMessages().getResultCode() ==
            APIContracts.MessageTypeEnum.OK
          ) {
            // so we want to validate the card first before we print this message.
            console.log(payment.cardNumber.slice(-4));
            paymentProfile.last_4_credit_card_number =
              payment.cardNumber.slice(-4);
            await paymentProfileRepository.save(paymentProfile);
            console.log(
              "Successfully updated a customer payment profile with id: " +
                paymentProfile.payment_profile_id
            );
          } else {
            //console.log('Result Code: ' + response.getMessages().getResultCode());
            console.log(
              "Error Code: " + response.getMessages().getMessage()[0].getCode()
            );
            console.log(
              "Error message: " +
                response.getMessages().getMessage()[0].getText()
            );
          }
        } else {
          console.log("Null response received");
        }
      });
      return true;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  // need to get subscription id from user query lets use the shortcut structured query to do in 1 try
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async KeepSubscription(@Ctx() { req }: MyContext): Promise<Boolean> {
    try {
      if (!req) console.log(req);
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        //user_id: 57
        user_id: req.session.userId,
      });
      if (!user) {
        throw new GraphQLError("User is not found.", {
          extensions: {
            code: "USER_NOT_FOUND",
          },
        });
      }
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
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
      console.log("subscription", subscription);

      // update it back to normal
      subscription.subscription_end_date = new Date("12-31-9999");
      const updatedSubscription = await subscriptionRepository.save(
        subscription
      );
      console.log(updatedSubscription);

      // first find the job by Id
      //const job = await cancelEmailQueue.getJob((subscription.authorize_subscription_id).toString());
      const job = await cancelSubscriptionQueue.getJob(
        "x" + subscription.authorize_subscription_id
      );
      //const job = await cancelEmailQueue.getJob("x" + "9149273");
      // then remove the job
      await job?.remove();

      return true;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
