import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SongController } from './app.controller';
import { AppService } from './app.service';
import { Song, Word, UniqueWord, GroupOfWords, Expression } from './entities';
// import { UserModule } from './user/user.module'; // Example module

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the config available everywhere in the app
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, // Automatically load entities
        synchronize: true, // This will create/update tables automatically
        logging: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Song, Word, UniqueWord, GroupOfWords, Expression]),
    // UserModule, // Import your feature modules here
  ],
  controllers: [SongController],
  providers: [AppService],
})
export class AppModule {}
