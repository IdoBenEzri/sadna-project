import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AppService } from '../src/app.service';

async function bootstrap() {
  try {
    // Create NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);
    const appService = app.get(AppService);

    console.log('Starting database restore process...');

    // Path to your backup file
    const backupPath = process.argv[2] || 'backup.xml';

    console.log(`Using backup file: ${backupPath}`);

    // Restore from XML
    await appService.restoreFromXml(backupPath);

    console.log('Database restore completed successfully!');
    
    // Close the application
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during database restore:', error);
    process.exit(1);
  }
}

bootstrap(); 