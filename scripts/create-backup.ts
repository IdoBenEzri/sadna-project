import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AppService } from '../src/app.service';

async function bootstrap() {
  try {
    // Create NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);
    const appService = app.get(AppService);

    console.log('Starting database backup process...');

    // Path for your backup file
    const backupPath = process.argv[2] || 'backup.xml';

    console.log(`Creating backup at: ${backupPath}`);

    // Create backup
    await appService.backupToXml(backupPath);

    console.log('Database backup completed successfully!');
    
    // Close the application
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during database backup:', error);
    process.exit(1);
  }
}

bootstrap(); 