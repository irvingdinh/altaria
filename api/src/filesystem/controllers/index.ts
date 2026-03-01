import { directoryControllers } from './directories';
import { entryControllers } from './entries';
import { fileControllers } from './files';
import { gitControllers } from './git';

export const controllers = [
  ...directoryControllers,
  ...entryControllers,
  ...fileControllers,
  ...gitControllers,
];
