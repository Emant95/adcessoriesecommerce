const app = require('./app');
const config = require('./lib/config');
const prisma = require('./lib/prisma');

const server = app.listen(config.port, () => {
  console.log(`API listening on port ${config.port} (${config.env})`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
