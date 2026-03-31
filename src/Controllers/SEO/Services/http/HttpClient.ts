import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export class HttpClient {
  private client: AxiosInstance;

  constructor(
    baseURL?: string,
    timeout: number = 10000,
    defaultHeaders: Record<string, string> = {}
  ) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        "Content-Type": "application/json",
        ...defaultHeaders,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        console.error("HTTP Client Error:", error.message);
        throw error;
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
}
