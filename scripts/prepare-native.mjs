import { cp, rm, copyFile } from 'node:fs/promises';
await rm('dist-native', { recursive: true, force: true });
await cp('dist', 'dist-native', { recursive: true });
await copyFile('dist/calculator/index.html', 'dist-native/index.html');
console.log('Native offline bundle prepared.');
