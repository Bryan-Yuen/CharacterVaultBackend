import { APIContracts, APIControllers } from "authorizenet";
import { sendCancelSubscriptionEmail } from "../config/mailJet";
import merchantAuthenticationType from "../config/authorize";

export const cancelSubscriptionJob = async (job: any) => {
  sendCancelSubscriptionEmail();

  console.log(job);

  var cancelRequest = new APIContracts.ARBCancelSubscriptionRequest();
  cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
  cancelRequest.setSubscriptionId(job.data.subscription_id);

  console.log(JSON.stringify(cancelRequest.getJSON(), null, 2));

  var ctrl = new APIControllers.ARBCancelSubscriptionController(
    cancelRequest.getJSON()
  );

  ctrl.execute(function () {
    var apiResponse = ctrl.getResponse();

    var response = new APIContracts.ARBCancelSubscriptionResponse(apiResponse);

    console.log(JSON.stringify(response, null, 2));

    if (response != null) {
      if (
        response.getMessages().getResultCode() ==
        APIContracts.MessageTypeEnum.OK
      ) {
        console.log(
          "Message Code : " + response.getMessages().getMessage()[0].getCode()
        );
        console.log(
          "Message Text : " + response.getMessages().getMessage()[0].getText()
        );
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
