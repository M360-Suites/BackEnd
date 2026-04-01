"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystack = exports.paystackClient = void 0;
// import paystack from 'paystack';
const axios_1 = __importDefault(require("axios"));
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY;
const paystack_1 = __importDefault(require("paystack"));
(apiSecretKey);
const paystack = (0, paystack_1.default)(apiSecretKey);
exports.paystack = paystack;
const paystackClient = axios_1.default.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
        Authorization: `Bearer ${apiSecretKey}`,
        "Content-Type": "application/json",
    },
});
exports.paystackClient = paystackClient;
