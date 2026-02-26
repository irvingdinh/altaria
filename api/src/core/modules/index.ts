import { configModule } from './config.module';
import { eventEmitterModule } from './event-emitter.module';
import { serveStaticModule } from './serve-static.module';
import { typeormForFeature, typeormForRoot } from './typeorm.module';

export const modules = [
  configModule,
  eventEmitterModule,
  ...(serveStaticModule ? [serveStaticModule] : []),
  typeormForRoot,
  typeormForFeature,
];
