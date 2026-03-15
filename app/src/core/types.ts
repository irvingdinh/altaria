import type { Server, WebSocketHandler } from 'bun';

export type WsData = {
  terminalId: string;
};

export type RestRoute = {
  method: string;
  pattern: RegExp;
  handler: (
    req: Request,
    match: RegExpMatchArray,
    server: Server<WsData>,
  ) => Response | Promise<Response>;
};

export type WsRoute = {
  pattern: RegExp;
  upgrade: (
    req: Request,
    match: RegExpMatchArray,
    server: Server<WsData>,
  ) => WsData | null;
  handler: WebSocketHandler<WsData>;
};

export type ModuleRoutes = {
  rest?: RestRoute[];
  ws?: WsRoute[];
  shutdown?: () => void;
};
