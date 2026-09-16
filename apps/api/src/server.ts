import 'dotenv/config';
import { buildApp } from './app.js';
import { loadEnvironment } from './config/env.js';

const environment = loadEnvironment();
const app = await buildApp({ environment });

const close = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => void close('SIGINT'));
process.on('SIGTERM', () => void close('SIGTERM'));

await app.listen({ host: environment.HOST, port: environment.PORT });
