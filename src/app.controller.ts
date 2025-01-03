import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('song')
export class SongController {
  constructor(private readonly AppService: AppService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // 'file' is the name of the form-data field
  async handleFileUpload(@UploadedFile() file: any) {
    console.log(file);
    const songId = await this.AppService.uploadSong(file);
    return { songId };
  }

  @Post('extra-details')
  async addExtraDetails(
    @Body()
    details: {
      songId: string;
      name: string;
      authors: string;
      composers: string;
      singers: string;
    },
  ) {
    await this.AppService.addExtraDetails(details);
    return { message: 'Extra details added successfully' };
  }

  @Get('words')
  async getWords(
    @Query()
    query: {
      rowIndex?: number;
      inlineIndex?: number;
      paragraphIndex?: number;
      song_ids?: string;
    },
  ): Promise<any[]> {
    return this.AppService.getWords(query);
  }

  @Get('word/context')
  async getWordContext(@Query('word') word: string): Promise<any[]> {
    return this.AppService.getWordContext(word);
  }

  @Post('group-of-words')
  async createGroupOfWords(@Body() body: { name: string; words: string[] }) {
    await this.AppService.createGroupOfWords(body.name, body.words);
    return { message: 'Group of words created successfully' };
  }

  @Get('group-of-words')
  async getGroups(): Promise<string[]> {
    return this.AppService.getGroups();
  }

  @Get('group-of-words/indexes')
  async getGroupIndexes(@Query('groupId') groupId: string): Promise<any> {
    return this.AppService.getGroupIndexes(groupId);
  }

  @Post('expression')
  async addExpression(@Body() body: { expression: string }): Promise<any> {
    await this.AppService.addExpression(body.expression);
    return { message: 'Expression added successfully' };
  }

  @Post('expression/search')
  async searchExpression(
    @Body() body: { expression: string; songId: string },
  ): Promise<any[]> {
    return this.AppService.searchExpression(body.expression, body.songId);
  }

  @Get('statistics')
  async getStatistics(): Promise<any> {
    return this.AppService.getStatistics();
  }

  @Get('statistics/occurences')
  async getWordOccurrences(): Promise<any[]> {
    return this.AppService.getWordOccurrences();
  }
}
