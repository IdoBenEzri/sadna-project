import { Controller, Post, Get, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('song')
export class SongController {
  constructor(private readonly AppService: AppService) {}

  @Post('upload')
  async uploadSong(@Body() body: { filename: string , fileData: string, name: string;
    authors: string;
    composers: string;
    singers: string; }): Promise<{ songId: string }> {
    console.log(body);
    const songId = await this.AppService.uploadSong(body);
    return { songId };
  }

  @Get('songs')
  async getSongs( @Query() query: { words?: string, composers?: string, singers?: string, authors?: string, name?: string }): Promise<any[]> {
    return this.AppService.getSongs(query);
    
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

  @Post('backup')
  async backupDatabase(@Body() body: { filepath: string }) {
    try {
      await this.AppService.backupToXml(body.filepath);
      return { message: 'Database backup completed successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to backup database: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('restore')
  async restoreDatabase(@Body() body: { filepath: string }) {
    try {
      await this.AppService.restoreFromXml(body.filepath);
      return { message: 'Database restored successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to restore database: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
