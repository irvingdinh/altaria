const args = process.argv.slice(2);

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (const arg of args) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return undefined;
}

const port = parseArg('port');
const host = parseArg('host');
const dataDir = parseArg('data-dir');

if (port) process.env.PORT = port;
if (host) process.env.HOST = host;
if (dataDir) process.env.DATA_DIR = dataDir;

void import('./main.js');
