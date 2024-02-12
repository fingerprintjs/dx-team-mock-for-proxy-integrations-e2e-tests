export interface RequestPayload {
  urlHost: string;
  path: string;
  queryParams: { [key: string]: string };
  headers: { [key: string]: string };
  method: string;
}

export interface ResponsePayload {
  contentType: string;
  statusCode: number;
}
export interface ApplicationLog {
  requestPayload: RequestPayload;
  responsePayload: ResponsePayload;
}

export type ApplicationLogger = (log: ApplicationLog) => void;
