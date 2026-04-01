"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorFunction = void 0;
const errorFunction = (scenarioName) => {
    let returnFunction = (error) => {
        console.log("An error occurred while processing, " + scenarioName);
        console.log("Error Message:" + error);
        console.log("Error Stack:" + error.stack);
    };
    return returnFunction;
};
exports.errorFunction = errorFunction;
// A utility function to wrap async controllers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((0, exports.errorFunction)(next));
};
exports.asyncHandler = asyncHandler;
