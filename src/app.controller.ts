import { Controller, Post, Get, Body, Query, Param, HttpException, HttpStatus, Header } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';

@Controller('song')
export class SongController {
  constructor(private readonly AppService: AppService) {}

  @Post('upload')
  async uploadSongs(@Body() body: { filenames: string[], data:  string[] }): Promise<{ songIds: string[] }> {
    console.log(body);
    const songIds = await this.AppService.uploadSongs(body);
    return { songIds };
  }

  @Get('songs')
  async getSongs( @Query() query: { words?: string, composers?: string, singers?: string, authors?: string, name?: string, songId?: string }): Promise<any[]> {
    return this.AppService.getSongs(query);
    
  }

  @Get('words')
  async getWords(
    @Query()
    query: {
      rowIndex?: string;
      inlineIndex?: string;
      paragraphIndex?: string;
      song_ids?: string;
    },
  ): Promise<any[]> {
    return this.AppService.getWords(query);
  }

  @Get('word/context')
  async getWordContext(@Query() query: { word: string, songId: string }): Promise<any[]> {
    return this.AppService.getWordContext(query.word, query.songId);
  }

  @Post('group-of-words')
  async createGroupOfWords(@Body() body: { name: string; words: string[] }) {
    const groupId = await this.AppService.createGroupOfWords(body.name, body.words);
    return { groupId, message: 'Group of words created successfully' };
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

  @Get('expression/search')
  async searchExpression(
    @Query() query: { expression: string; songId: string },
  ): Promise<any[]> {
    return this.AppService.searchExpression(query.expression, query.songId);
  }

  @Get('statistics')
  async getStatistics(): Promise<any> {
    return this.AppService.getStatistics();
  }

  @Get('statistics/occurences')
  async getWordOccurrences(): Promise<{words: string[], occurrences: number[]}> {
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

  @Get('export-xml')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename="backup.xml"')
  async exportXml() {
    const xmlContent = await this.AppService.exportToXml();
    return xmlContent;
  }

  @Post('import-xml')
  async importXml(@Body('xml') xml: string) {
    await this.AppService.importFromXml(xml);
    return { message: 'Import completed successfully' };
  }

  @Post('import-xml-file')
  async importXmlFile() {
    const xmlContent = fs.readFileSync('backup.xml', 'utf-8');
    await this.AppService.importFromXml(xmlContent);
    return { message: 'Import from file completed successfully' };
  }
}



