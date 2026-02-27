import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class SpaMiddleware implements NestMiddleware {
  private readonly staticRoot: string;

  constructor() {
    this.staticRoot = join(__dirname, '..', '..');
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (
      req.originalUrl.startsWith('/api') ||
      req.originalUrl.startsWith('/ws') ||
      req.originalUrl.startsWith('/swagger')
    ) {
      return next();
    }

    if (existsSync(join(this.staticRoot, req.originalUrl))) {
      return res.sendFile(req.originalUrl, { root: this.staticRoot });
    }

    res.sendFile('index.html', { root: this.staticRoot });
  }
}
