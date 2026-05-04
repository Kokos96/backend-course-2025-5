const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { program } = require('commander');

// Читання аргументів командного рядка
program
  .requiredOption('-h, --host <type>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії, яка міститиме кешовані файли');

program.parse(process.argv);
const options = program.opts();

async function startServer() {
  try {
    // Створення директорії кешу під час запуску, якщо її не існує[cite: 1]
    await fs.mkdir(options.cache, { recursive: true });
    console.log(`Директорію кешу перевірено/створено: ${options.cache}`);
  } catch (err) {
    console.error('Помилка створення директорії кешу:', err);
    process.exit(1);
  }

  // Запуск веб-сервера[cite: 1]
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сервер працює! Переходимо до методів.');
  });

  // Значення параметрів передані у метод listen[cite: 1]
  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  });
}

startServer();