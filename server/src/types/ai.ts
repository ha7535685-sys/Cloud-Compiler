export interface AiBaseRequest {
  language: string;
  code: string;
  stderr?: string;
}

export interface AiExplainResponse {
  explanation: string;
}

export interface AiFixResponse {
  explanation: string;
  fixedCode: string;
  diff?: string;
}

export interface AiCommentResponse {
  commentedCode: string;
  explanation?: string;
}
