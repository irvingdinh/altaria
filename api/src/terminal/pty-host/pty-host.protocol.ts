/**
 * IPC Protocol for communication between the main NestJS process and the PTY host child process.
 */

export enum PtyHostRequestType {
  Create = 'create',
  Write = 'write',
  Resize = 'resize',
  Destroy = 'destroy',
  Heartbeat = 'heartbeat',
  AcknowledgeData = 'acknowledgeData',
  SerializeBuffer = 'serializeBuffer',
  Shutdown = 'shutdown',
}

export enum PtyHostResponseType {
  Data = 'data',
  Exit = 'exit',
  Ready = 'ready',
  Heartbeat = 'heartbeat',
  SerializedBuffer = 'serializedBuffer',
  Error = 'error',
  Created = 'created',
}

export interface CreateRequest {
  type: PtyHostRequestType.Create;
  sessionId: string;
  command: string;
  args: string[];
  cwd: string;
  cols: number;
  rows: number;
  env: Record<string, string>;
  shellIntegrationPath?: string;
}

export interface WriteRequest {
  type: PtyHostRequestType.Write;
  sessionId: string;
  data: string;
}

export interface ResizeRequest {
  type: PtyHostRequestType.Resize;
  sessionId: string;
  cols: number;
  rows: number;
}

export interface DestroyRequest {
  type: PtyHostRequestType.Destroy;
  sessionId: string;
}

export interface HeartbeatRequest {
  type: PtyHostRequestType.Heartbeat;
}

export interface AcknowledgeDataRequest {
  type: PtyHostRequestType.AcknowledgeData;
  sessionId: string;
  charCount: number;
}

export interface SerializeBufferRequest {
  type: PtyHostRequestType.SerializeBuffer;
  sessionId: string;
}

export interface ShutdownRequest {
  type: PtyHostRequestType.Shutdown;
}

export type PtyHostRequest =
  | CreateRequest
  | WriteRequest
  | ResizeRequest
  | DestroyRequest
  | HeartbeatRequest
  | AcknowledgeDataRequest
  | SerializeBufferRequest
  | ShutdownRequest;

export interface DataResponse {
  type: PtyHostResponseType.Data;
  sessionId: string;
  data: string;
}

export interface ExitResponse {
  type: PtyHostResponseType.Exit;
  sessionId: string;
  exitCode: number;
}

export interface ReadyResponse {
  type: PtyHostResponseType.Ready;
}

export interface HeartbeatResponse {
  type: PtyHostResponseType.Heartbeat;
}

export interface SerializedBufferResponse {
  type: PtyHostResponseType.SerializedBuffer;
  sessionId: string;
  buffer: string;
}

export interface ErrorResponse {
  type: PtyHostResponseType.Error;
  sessionId?: string;
  message: string;
}

export interface CreatedResponse {
  type: PtyHostResponseType.Created;
  sessionId: string;
}

export type PtyHostResponse =
  | DataResponse
  | ExitResponse
  | ReadyResponse
  | HeartbeatResponse
  | SerializedBufferResponse
  | ErrorResponse
  | CreatedResponse;

export const FlowControlConstants = {
  HighWatermarkChars: 100000,
  LowWatermarkChars: 5000,
  CharCountAckSize: 5000,
} as const;

export const HeartbeatConstants = {
  BeatInterval: 5000,
  FirstWaitMultiplier: 1.2,
  SecondWaitMultiplier: 1,
  MaxRestarts: 5,
} as const;

export const BufferConstants = {
  MaxScrollback: 10000,
  SerializeInterval: 30000,
} as const;
