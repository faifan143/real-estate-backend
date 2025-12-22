import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS - allow all origins for network access
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.useStaticAssets(join(process.cwd(), 'public'));

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  
  // Get network IP addresses for display
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses: string[] = [];
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddresses.push(iface.address);
      }
    }
  }
  
  console.log(`Application is running on: http://${host}:${port}`);
  if (ipAddresses.length > 0) {
    console.log(`Accessible from network at:`);
    ipAddresses.forEach(ip => {
      console.log(`  - http://${ip}:${port}/health`);
    });
  }
  console.log(`CORS enabled for: all origins`);
}

bootstrap();
