const fs = require("fs");
const { AttachmentsOperations } = require("@zohocrm/nodejs-sdk-2.0/core/com/zoho/crm/api/attachments/attachments_operations");
const { StreamWrapper } = require("@zohocrm/nodejs-sdk-2.0/utils/util/stream_wrapper");
const { FileBodyWrapper } = require("@zohocrm/nodejs-sdk-2.0/core/com/zoho/crm/api/attachments/file_body_wrapper");
const { ActionWrapper } = require("@zohocrm/nodejs-sdk-2.0/core/com/zoho/crm/api/attachments/action_wrapper");
const { SuccessResponse } = require("@zohocrm/nodejs-sdk-2.0/core/com/zoho/crm/api/attachments/success_response");
const { APIException } = require("@zohocrm/nodejs-sdk-2.0/core/com/zoho/crm/api/attachments/api_exception");

class Attachment {
    static async uploadAttachments(moduleAPIName, recordId, absoluteFilePath) {
        try {
            // Convert recordId to BigInt if it's not already
            if (typeof recordId === 'undefined' || recordId === null) {
                throw new Error("Invalid lead ID: Cannot convert undefined or null to BigInt");
            }
            const leadId = BigInt(recordId); // Ensure it's a BigInt

            // Validate moduleAPIName is a string
            if (typeof moduleAPIName !== 'string') {
                throw new Error("Invalid module API name: Must be a string");
            }

            // Initialize AttachmentsOperations with the module API name (e.g., 'Leads')
            let attachmentsOperations = new AttachmentsOperations(moduleAPIName);

            // Create a stream wrapper for the file
            let streamWrapper = new StreamWrapper(null, fs.createReadStream(absoluteFilePath), absoluteFilePath);

            // Create a FileBodyWrapper object
            let fileBodyWrapper = new FileBodyWrapper();
            fileBodyWrapper.setFile(streamWrapper);

            // Upload the attachment with the correct BigInt recordId (leadId)
            let response = await attachmentsOperations.uploadAttachment(leadId, fileBodyWrapper);

            // Process the response
            if (response != null) {
                console.log("Status Code: " + response.statusCode);
                let responseObject = response.object;

                if (responseObject != null) {
                    if (responseObject instanceof ActionWrapper) {
                        let actionResponses = responseObject.getData();
                        actionResponses.forEach(actionResponse => {
                            if (actionResponse instanceof SuccessResponse) {
                                console.log("Status: " + actionResponse.getStatus().getValue());
                                console.log("Message: " + actionResponse.getMessage().getValue());
                            } else if (actionResponse instanceof APIException) {
                                console.error("Error uploading attachment: " + actionResponse.getMessage().getValue());
                            }
                        });
                    } else if (responseObject instanceof APIException) {
                        console.error("Error: " + responseObject.getMessage().getValue());
                    }
                }
            }
        } catch (error) {
            console.error("Error uploading attachment:", error.message);
            throw error;
        }
    }
}

module.exports = { Attachment };
