// import paystack from 'paystack';
import axios from "axios";
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY!;
import Pays from 'paystack';(apiSecretKey);

const paystack = Pays(apiSecretKey);

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${apiSecretKey}`,
    "Content-Type": "application/json",
  },
});

export { paystackClient, paystack };