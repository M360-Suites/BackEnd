"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
class HttpClient {
    constructor(baseURL, timeout = 10000, defaultHeaders = {}) {
        this.client = axios_1.default.create({
            baseURL,
            timeout,
            headers: {
                "Content-Type": "application/json",
                ...defaultHeaders,
            },
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.client.interceptors.response.use((response) => response, (error) => {
            console.error("HTTP Client Error:", error.message);
            throw error;
        });
    }
    async get(url, config) {
        const response = await this.client.get(url, config);
        return response.data;
    }
    async post(url, data, config) {
        const response = await this.client.post(url, data, config);
        return response.data;
    }
}
exports.HttpClient = HttpClient;
