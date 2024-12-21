import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { UserModule } from './user/user.module'; // Example module

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the config available everywhere in the app
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, // Automatically load entities
        synchronize: true, // Use this ONLY in development
      }),
      inject: [ConfigService],
    }),
    // UserModule, // Import your feature modules here
  ],
})
export class AppModule {}
