/**
 * Entry point for the PTY host child process.
 * This runs in a separate Node.js process for crash isolation.
 */

import { PtyServiceChild } from './pty.service';
import type { PtyHostRequest, PtyHostResponse } from './pty-host.protocol';
import { PtyHostResponseType } from './pty-host.protocol';

function send(msg: PtyHostResponse): void {
  if (process.send) {
    process.send(msg);
  }
}

const ptyService = new PtyServiceChild(send);

process.on('message', (msg: PtyHostRequest) => {
  ptyService.handleMessage(msg);
});

process.on('uncaughtException', (error) => {
  send({
    type: PtyHostResponseType.Error,
    message: `Uncaught exception: ${error.message}`,
  });
});

process.on('unhandledRejection', (reason) => {
  send({
    type: PtyHostResponseType.Error,
    message: `Unhandled rejection: ${String(reason)}`,
  });
});

send({ type: PtyHostResponseType.Ready });
