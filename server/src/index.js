import app from './app.js';
import { connectDatabase } from './config/database.js';
import { config } from './config/env.js';

async function start() {
  try {
    await connectDatabase();
    const server = app.listen(config.port, () => {
      console.log(`[server] API listening on port ${config.port}`);
    });

    const shutDown = async () => {
      console.log('\n[server] Shutting down...');
      server.close();
      process.exit(0);
    };

    process.on('SIGINT', shutDown);
    process.on('SIGTERM', shutDown);
  } catch (error) {
    console.error('[server] Failed to start', error);
    process.exit(1);
  }
}

start();
