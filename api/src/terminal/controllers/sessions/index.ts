import { CreateController } from './create.controller';
import { DestroyController } from './destroy.controller';
import { DetachController } from './detach.controller';
import { IndexController } from './index.controller';

export const sessionControllers = [
  CreateController,
  DestroyController,
  DetachController,
  IndexController,
];
