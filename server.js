// const http = require('node:http');
// const fs = require('node:fs/promises');
// const path = require('node:path');
// const { program } = require('commander');

// // Читання аргументів командного рядка
// program
//   .requiredOption('-h, --host <type>', 'адреса сервера')
//   .requiredOption('-p, --port <number>', 'порт сервера')
//   .requiredOption('-c, --cache <path>', 'шлях до директорії, яка міститиме кешовані файли');

// program.parse(process.argv);
// const options = program.opts();

// async function startServer() {
//   try {
//     // Створення директорії кешу під час запуску, якщо її не існує[cite: 1]
//     await fs.mkdir(options.cache, { recursive: true });
//     console.log(`Директорію кешу перевірено/створено: ${options.cache}`);
//   } catch (err) {
//     console.error('Помилка створення директорії кешу:', err);
//     process.exit(1);
//   }

//   // Запуск веб-сервера[cite: 1]
//   const server = http.createServer((req, res) => {
//     res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
//     res.end('Сервер працює! Переходимо до методів.');
//   });

//   // Значення параметрів передані у метод listen[cite: 1]
//   server.listen(options.port, options.host, () => {
//     console.log(`Сервер запущено на http://${options.host}:${options.port}`);
//   });
// }

// startServer();


const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { program } = require('commander');
const superagent = require('superagent'); // Підключаємо superagent для Частини 3

// ==========================================
// ЧАСТИНА 1: Параметри командного рядка
// ==========================================
program
  .requiredOption('-h, --host <type>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії, яка міститиме кешовані файли');

program.parse(process.argv);
const options = program.opts();

async function startServer() {
  try {
    await fs.mkdir(options.cache, { recursive: true });
    console.log(`Директорію кешу перевірено/створено: ${options.cache}`);
  } catch (err) {
    console.error('Помилка створення директорії кешу:', err);
    process.exit(1);
  }

  // ==========================================
  // ЧАСТИНА 2 та 3: Логіка проксі-сервера
  // ==========================================
  const server = http.createServer(async (req, res) => {
    const statusCode = req.url.slice(1);
    const filePath = path.join(options.cache, `${statusCode}.jpg`);

    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Method Not Allowed');
    }

    try {
      if (req.method === 'GET') {
        try {
          // Спочатку шукаємо в кеші
          const data = await fs.readFile(filePath);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(data);
          console.log(`[CACHE] Віддано з кешу: ${statusCode}.jpg`);
        } catch (err) {
          // ЧАСТИНА 3: Якщо в кеші немає, йдемо на http.cat[cite: 1]
          try {
            console.log(`[PROXY] Завантажуємо з http.cat: ${statusCode}...`);
            const response = await superagent.get(`https://http.cat/${statusCode}`);
            const imageBuffer = response.body;

            // Зберігаємо картинку у кеш, щоб наступного разу брати звідти[cite: 1]
            await fs.writeFile(filePath, imageBuffer);
            
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(imageBuffer);
            console.log(`[PROXY] Збережено в кеш та віддано: ${statusCode}.jpg`);
          } catch (superErr) {
            // Якщо запит на http.cat завершився помилкою[cite: 1]
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
          }
        }
      } 
      
      else if (req.method === 'PUT') {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        await fs.writeFile(filePath, buffer);
        
        res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Created');
      } 
      
      else if (req.method === 'DELETE') {
        try {
          await fs.unlink(filePath);
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Deleted');
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
        }
      }
    } catch (globalErr) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  });
}

startServer();