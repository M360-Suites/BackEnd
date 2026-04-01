"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractErrorMessage = void 0;
const axios_1 = require("axios");
const extractErrorMessage = (error) => {
    // Check if the error is an AxiosError
    if (error.isAxiosError) {
        // Handle specific error codes
        switch (error.code) {
            case axios_1.AxiosError.ETIMEDOUT:
                return `Connection timed out while trying to reach the server.`;
            case axios_1.AxiosError.ECONNABORTED:
                return `Connection was aborted.`;
            case axios_1.AxiosError.ERR_NETWORK:
                return `Network error occurred. Please check your connection.`;
            case axios_1.AxiosError.ERR_BAD_REQUEST:
                return `Bad request. Please check the request parameters.`;
            case axios_1.AxiosError.ERR_BAD_RESPONSE:
                return `Received a bad response from the server.`;
            default:
                return error.message || "An unknown error occurred.";
        }
    }
    return "An error occurred, but it is not an Axios error.";
};
exports.extractErrorMessage = extractErrorMessage;
// Example usage
// const errorResponse: AxiosError = new AxiosError(
//   "Request failed with status code 404",
//   AxiosError.ERR_BAD_REQUEST,
//   undefined,
//   undefined,
//   {
//     status: 404,
//     data: {},
//     headers: {},
//     config: {},
//     request: {},
//   }
// );
// const userMessage = extractErrorMessage(errorResponse);
// console.log(userMessage);
