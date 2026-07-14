/**
 * HTTP Client with automatic logging and sensitive data masking
 * AOP-style interceptor for all external API calls
 */

import { apiLogger } from './logger-enhanced';

interface LoggedRequestInit extends RequestInit {
  skipLogging?: boolean; // 로깅을 건너뛸 옵션
  logResponseBody?: boolean; // 응답 바디 로깅 여부
}

interface HttpClientOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

interface RequestMetadata {
  url: string;
  method: string;
  isExternal: boolean;
  startTime: number;
  headers?: Record<string, string>;
  hasBody: boolean;
}

/**
 * HTTP Client with comprehensive logging
 */
class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.defaultHeaders = options.defaultHeaders || {};
    this.timeout = options.timeout || 30000;
  }

  /**
   * URL을 안전하게 로깅하기 위해 민감한 파라미터 마스킹
   */
  private maskUrl(url: string): string {
    return url
      .replace(/([?&])(access_token|token|key|secret|password|client_secret)=([^&]*)/gi, '$1$2=***')
      .replace(/(Bearer\s+)[^\s&]+/gi, '$1***');
  }

  /**
   * 요청 헤더에서 민감한 정보 마스킹
   */
  private maskHeaders(headers: any): Record<string, string> {
    const masked: Record<string, string> = {};
    
    Object.entries(headers || {}).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      if (keyLower.includes('authorization') || 
          keyLower.includes('token') ||
          keyLower.includes('key') ||
          keyLower.includes('secret')) {
        masked[key] = '***';
      } else {
        masked[key] = String(value);
      }
    });
    
    return masked;
  }

  /**
   * 요청 바디에서 민감한 정보 마스킹
   */
  private maskRequestBody(body: any): string {
    if (!body) return 'undefined';
    
    try {
      if (body instanceof URLSearchParams) {
        const params: Record<string, string> = {};
        body.forEach((value, key) => {
          if (/token|password|secret|key|client_secret/i.test(key)) {
            params[key] = '***';
          } else {
            params[key] = value;
          }
        });
        return JSON.stringify(params);
      }
      
      if (body instanceof FormData) {
        const formObj: Record<string, any> = {};
        body.forEach((value, key) => {
          if (/token|password|secret|key/i.test(key)) {
            formObj[key] = '***';
          } else {
            formObj[key] = value instanceof File ? `[File: ${value.name}]` : value;
          }
        });
        return JSON.stringify(formObj);
      }
      
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          return this.maskObjectData(parsed);
        } catch {
          // JSON이 아닌 문자열인 경우 민감정보 패턴 마스킹
          return body
            .replace(/(token|password|secret|key)[=:]\s*[^\s&,]*/gi, '$1=***')
            .replace(/bearer\s+[^\s]*/gi, 'bearer ***');
        }
      }
      
      return this.maskObjectData(body);
    } catch (error) {
      return '[Body masking failed]';
    }
  }

  /**
   * 객체 데이터에서 민감한 정보 마스킹
   */
  private maskObjectData(data: any): string {
    if (!data) return 'null';
    
    const masked = { ...data };
    Object.keys(masked).forEach(key => {
      if (/token|password|secret|key|auth/i.test(key) && typeof masked[key] === 'string') {
        masked[key] = '***';
      }
    });
    
    return JSON.stringify(masked);
  }

  /**
   * 응답 헤더 추출
   */
  private getResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * 응답 바디에서 민감한 정보 마스킹 (선택적)
   */
  private async maskResponseBody(response: Response): Promise<string> {
    try {
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // JSON 응답의 경우 복사본을 만들어 마스킹
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        return this.maskObjectData(data);
      } else if (contentType.includes('text/')) {
        // 텍스트 응답의 경우 길이 제한
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        return text.length > 200 ? `${text.substring(0, 200)}...` : text;
      }
      
      return `[${contentType || 'Unknown content type'}]`;
    } catch (error) {
      return '[Response parsing failed]';
    }
  }

  /**
   * 요청이 외부 API인지 확인
   */
  private isExternalApi(url: string): boolean {
    // 절대 URL이면서 내부 도메인이 아닌 경우
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    // 내부 API URL 패턴들 (환경에 따라 조정 필요)
    const internalPatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /192\.168\./,
      /10\.0\.2\.2/, // Android emulator
      /172\./,       // Docker networks
      process.env.EXPO_PUBLIC_API_URL,
      process.env.EXPO_PUBLIC_API_URL_PRODUCTION
    ].filter((pattern): pattern is string | RegExp => Boolean(pattern));

    return !internalPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return url.toLowerCase().includes(pattern.toLowerCase());
      }
      return pattern.test(url);
    });
  }

  /**
   * 요청 메타데이터 생성
   */
  private createRequestMetadata(
    input: RequestInfo | URL, 
    init: LoggedRequestInit = {}
  ): RequestMetadata {
    const url = typeof input === 'string' ? input : 
                input instanceof URL ? input.href : input.url;
    
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    const method = init.method || 'GET';
    const isExternal = this.isExternalApi(fullUrl);

    return {
      url: fullUrl,
      method: method.toUpperCase(),
      isExternal,
      startTime: Date.now(),
      headers: this.maskHeaders(init.headers),
      hasBody: !!init.body
    };
  }

  /**
   * 메인 fetch 래퍼 함수
   */
  async fetch(
    input: RequestInfo | URL, 
    init: LoggedRequestInit = {}
  ): Promise<Response> {
    const { skipLogging = false, logResponseBody = false, ...fetchOptions } = init;
    
    // 요청 메타데이터 생성
    const metadata = this.createRequestMetadata(input, fetchOptions);
    const logPrefix = metadata.isExternal ? '🌐 [External]' : '📡 [Internal]';

    // 헤더 병합
    const headers = {
      ...this.defaultHeaders,
      ...fetchOptions.headers,
    };

    // 요청 로깅
    if (!skipLogging) {
      apiLogger.info(`${metadata.method} ${this.maskUrl(metadata.url)}`, {
        url: this.maskUrl(metadata.url),
        method: metadata.method,
        isExternal: metadata.isExternal,
        headers: Object.keys(headers).length > 0 ? this.maskHeaders(headers) : undefined,
        hasBody: metadata.hasBody,
        bodyPreview: metadata.hasBody ? this.maskRequestBody(fetchOptions.body) : undefined
      });
    }

    try {
      // 타임아웃 처리
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(input, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal || controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const duration = Date.now() - metadata.startTime;
      
      if (!skipLogging) {
        const logLevel = response.ok ? 'info' : 'warn';
        const statusIcon = response.ok ? '✅' : '❌';
        
        apiLogger[logLevel](`${response.status} ${metadata.method} ${this.maskUrl(metadata.url)} (${duration}ms)`, {
          status: response.status,
          statusText: response.statusText,
          duration,
          isExternal: metadata.isExternal,
          responseHeaders: metadata.isExternal ? this.getResponseHeaders(response) : undefined,
          contentType: response.headers.get('content-type'),
          responseSize: response.headers.get('content-length')
        });
        
        // 응답 바디 로깅 (옵션이거나 에러인 경우)
        if (logResponseBody || !response.ok) {
          try {
            const maskedBody = await this.maskResponseBody(response);
            apiLogger[logLevel](`Response Body: ${maskedBody}`, {
              url: this.maskUrl(metadata.url),
              status: response.status
            });
          } catch (bodyError) {
            apiLogger.debug('Failed to log response body', { 
              error: bodyError instanceof Error ? bodyError.message : String(bodyError) 
            });
          }
        }
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - metadata.startTime;
      
      if (!skipLogging) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            apiLogger.warn(`⏱️ Timeout ${metadata.method} ${this.maskUrl(metadata.url)} (${duration}ms)`, {
              timeout: this.timeout,
              duration,
              isExternal: metadata.isExternal
            });
          } else {
            apiLogger.error(`Error ${metadata.method} ${this.maskUrl(metadata.url)} (${duration}ms)`, {
              error: error.message,
              errorName: error.name,
              stack: error.stack,
              duration,
              isExternal: metadata.isExternal
            });
          }
        } else {
          apiLogger.error(`Unknown error ${metadata.method} ${this.maskUrl(metadata.url)} (${duration}ms)`, {
            error: String(error),
            duration,
            isExternal: metadata.isExternal
          });
        }
      }
      
      throw error;
    }
  }

  /**
   * 편의 메서드들
   */
  async get(url: string, init?: LoggedRequestInit): Promise<Response> {
    return this.fetch(url, { ...init, method: 'GET' });
  }

  async post(url: string, body?: any, init?: LoggedRequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');

    return this.fetch(url, {
      ...init,
      method: 'POST',
      headers,
      body: typeof body === 'object' ? JSON.stringify(body) : body,
    });
  }

  async put(url: string, body?: any, init?: LoggedRequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');

    return this.fetch(url, {
      ...init,
      method: 'PUT',
      headers,
      body: typeof body === 'object' ? JSON.stringify(body) : body,
    });
  }

  async patch(url: string, body?: any, init?: LoggedRequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');

    return this.fetch(url, {
      ...init,
      method: 'PATCH',
      headers,
      body: typeof body === 'object' ? JSON.stringify(body) : body,
    });
  }

  async delete(url: string, init?: LoggedRequestInit): Promise<Response> {
    return this.fetch(url, { ...init, method: 'DELETE' });
  }
}

// 싱글톤 인스턴스
export const httpClient = new HttpClient();

// 기본 내보내기
export default httpClient;
