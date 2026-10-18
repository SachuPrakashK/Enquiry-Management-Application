import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['--watch', 'server/api.ts'], { stdio: 'inherit' }),
  spawn(
    process.execPath,
    [
      'node_modules/@angular/cli/bin/ng.js',
      'serve',
      '--proxy-config',
      'proxy.conf.json',
      '--host',
      '127.0.0.1',
    ],
    { stdio: 'inherit' },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill());
  process.exitCode = code;
}
children.forEach((child) => child.on('exit', (code) => stop(code || 0)));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
