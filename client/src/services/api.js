const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

class ApiClient {
  baseUrl;

  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        credentials: "include", // Include HTTP-only cookies in all requests
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          message: data?.message || `HTTP Error: ${response.status} ${response.statusText}`,
          error: data?.error,
        };
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error or server unreachable";
      return {
        success: false,
        message: errorMsg,
      };
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch(endpoint, body) {
    return this.request(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }

  // Health check endpoint
  async checkHealth() {
    const result = await this.get("/health");
    if (result.success && result.message) {
      return {
        success: true,
        message: result.message,
      };
    }
    return {
      success: false,
      message: result.message || "Could not connect to CampusFlow API",
    };
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
