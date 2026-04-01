"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransactions = exports.fetchTransaction = exports.verifyTransaction = exports.initiateTransaction = void 0;
const https_1 = __importDefault(require("https"));
const initiateTransaction = async (body) => {
    const params = JSON.stringify(body);
    const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY;
    let data = '';
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiSecretKey}`,
            'Content-Type': 'application/json',
        },
    };
    const req = https_1.default
        .request(options, (res) => {
        // let data = "";
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(JSON.parse(data));
        });
    })
        .on('error', (error) => {
        console.error(error);
    });
    req.write(params);
    req.end();
    return JSON.parse(data);
};
exports.initiateTransaction = initiateTransaction;
const verifyTransaction = async (reference) => {
    const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY;
    let data = '';
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiSecretKey}`,
        },
    };
    https_1.default
        .request(options, (res) => {
        // let data = "";
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(JSON.parse(data));
        });
    })
        .on('error', (error) => {
        console.error(error);
    });
    return JSON.parse(data);
};
exports.verifyTransaction = verifyTransaction;
const fetchTransaction = async (id) => {
    let data = '';
    const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY;
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/${id}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiSecretKey}`,
        },
    };
    https_1.default
        .request(options, (res) => {
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(JSON.parse(data));
        });
    })
        .on('error', (error) => {
        console.error(error);
    });
    return JSON.parse(data);
};
exports.fetchTransaction = fetchTransaction;
const listTransactions = async () => {
    let data = '';
    const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY;
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiSecretKey}`,
        },
    };
    https_1.default
        .request(options, (res) => {
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(JSON.parse(data));
        });
    })
        .on('error', (error) => {
        console.error(error);
    });
    return JSON.parse(data);
};
exports.listTransactions = listTransactions;
