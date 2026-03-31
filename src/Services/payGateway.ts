import https from 'https';
import { InitTransaction } from '../Types/payment';

export const initiateTransaction = async (body: InitTransaction) => {
  const params = JSON.stringify(body);
  const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY!;
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

  const req = https
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

export const verifyTransaction = async (reference: string) => {
  const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY!;
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

  https
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

export const fetchTransaction = async (id: string) => {
  let data = '';
  const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY!;

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/${id}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiSecretKey}`,
    },
  };

  https
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

export const listTransactions = async () => {
  let data = '';
  const apiSecretKey = process.env.PAYSTACK_TEST_SECRET_KEY!;

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/transaction',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiSecretKey}`,
    },
  };

  https
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
