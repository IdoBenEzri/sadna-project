import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Song, Word, UniqueWord, GroupOfWords, Expression } from './entities';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,

    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,

    @InjectRepository(UniqueWord)
    private readonly uniqueWordRepository: Repository<UniqueWord>,

    @InjectRepository(GroupOfWords)
    private readonly groupOfWordsRepository: Repository<GroupOfWords>,

    @InjectRepository(Expression)
    private readonly expressionRepository: Repository<Expression>,
  ) {}

  async uploadSong(file: any): Promise<string> {
    this.logger.log('uploadSong called');
    if (!file) {
      this.logger.error('No file provided');
      throw new Error('No file provided');
    }

    const fileContent = file.buffer.toString('utf-8');
    const fileName = file.originalname;
    let song = await this.songRepository.findOne({ where: { name: fileName } });

    if (song) {
      this.logger.error('Song already exists');
      return;
    }
    song = this.songRepository.create({
      filename: fileName,
    });
    // saving the new song to the database
    await this.songRepository.save(song);
    this.logger.log(
      `Song uploaded successfully, Id: ${song.id}, Name: ${fileName}`,
    );
    const lines = fileContent.split('\n');
    let paragraphIndex = 0;
    for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
      const line = lines[rowIndex].trim();
      if (line === '' || line === '\r' || line === '\n') {
        paragraphIndex++;
        continue;
      }
      const words = line.split(/\s+/);
      for (let inRowIndex = 0; inRowIndex < words.length; inRowIndex++) {
        const wordText = words[inRowIndex]
          .replace(/[.,!?;:"'()]/g, '')
          .toLowerCase();

        let uniqueWord = await this.uniqueWordRepository.findOne({
          where: { text: wordText, songId: song.id },
        });

        if (!uniqueWord) {
          uniqueWord = this.uniqueWordRepository.create({
            text: wordText,
            songId: song.id,
          });
          await this.uniqueWordRepository.save(uniqueWord);
          this.logger.log(`Saved Unique word: ${uniqueWord.text}`);
        }

        const word = this.wordRepository.create({
          songId: song.id,
          rowIndex,
          inRowIndex,
          paragraphIndex,
          text: wordText,
          uniqueWordId: uniqueWord.id,
        });
        await this.wordRepository.save(word);
        this.logger.log(`Saved word: ${word.text}`);
      }
    }
    this.logger.log('uploadSong completed');
    return;
  }

  async addExtraDetails(details: {
    songId: string;
    name: string;
    authors: string;
    composers: string;
    singers: string;
  }): Promise<void> {
    this.logger.log('addExtraDetails called');
    const song = await this.songRepository.findOne({
      where: { id: details.songId },
    });
    if (!song) {
      this.logger.error('Song not found');
      throw new Error('Song not found');
    }

    song.name = details.name;
    song.author = details.authors;
    song.composers = details.composers.split(',');
    song.singers = details.singers.split(',');

    await this.songRepository.save(song);
    this.logger.log('addExtraDetails completed');
  }

  async getWords(query: {
    rowIndex?: number;
    inlineIndex?: number;
    paragraphIndex?: number;
    song_ids?: string;
  }): Promise<any[]> {
    this.logger.log('getWords called');
    const qb = this.wordRepository.createQueryBuilder('word');

    if (query.rowIndex !== undefined)
      qb.andWhere('word.rowIndex = :rowIndex', { rowIndex: query.rowIndex });
    if (query.inlineIndex !== undefined)
      qb.andWhere('word.inRowIndex = :inlineIndex', {
        inlineIndex: query.inlineIndex,
      });
    if (query.paragraphIndex !== undefined)
      qb.andWhere('word.paragraphIndex = :paragraphIndex', {
        paragraphIndex: query.paragraphIndex,
      });
    if (query.song_ids)
      qb.andWhere('word.songId IN (:...song_ids)', {
        song_ids: query.song_ids.split('.'),
      });

    const result = await qb.getMany();
    this.logger.log('getWords completed');
    return result;
  }

  async getWordContext(word: string): Promise<any[]> {
    return;
  }

  async createGroupOfWords(name: string): Promise<void> {
    this.logger.log('createGroupOfWords called');
    const group = this.groupOfWordsRepository.create({
      name,
      groupId: Date.now().toString(),
      uniqueWordId: null,
    });
    await this.groupOfWordsRepository.save(group);
    this.logger.log('createGroupOfWords completed');
  }

  async getGroups(): Promise<string[]> {
    this.logger.log('getGroups called');
    const groups = await this.groupOfWordsRepository.find();
    const result = groups.map((group) => group.name);
    this.logger.log('getGroups completed');
    return result;
  }

  async getGroupIndexes(groupId: string): Promise<any> {
    this.logger.log('getGroupIndexes called');
    const group = await this.groupOfWordsRepository.findOne({
      where: { groupId },
      relations: ['uniqueWord'],
    });
    if (!group) {
      this.logger.error('Group not found');
      throw new Error('Group not found');
    }

    const indexes = {};
    const words = await this.wordRepository.find({
      where: { uniqueWordId: group.uniqueWordId },
      relations: ['song'],
    });

    for (const word of words) {
      if (!indexes[word.text]) {
        indexes[word.text] = [];
      }
      indexes[word.text].push({
        songName: (
          await this.songRepository.findOne({ where: { id: word.songId } })
        ).name,
        inlineIndex: word.inRowIndex,
        rowIndex: word.rowIndex,
        paragraphIndex: word.paragraphIndex,
      });
    }
    this.logger.log('getGroupIndexes completed');
    return indexes;
  }

  async addExpression(expression: string): Promise<void> {
    this.logger.log('addExpression called');
    const expr = this.expressionRepository.create({ text: expression });
    await this.expressionRepository.save(expr);
    this.logger.log('addExpression completed');
  }

  async searchExpression(expression: string, songId: string): Promise<any[]> {
    this.logger.log('searchExpression called');
    const song = await this.songRepository.findOne({
      where: { id: songId },
      relations: ['words'],
    });
    if (!song) {
      this.logger.error('Song not found');
      throw new Error('Song not found');
    }

    const matches = [];
    const expressionWords = expression.split(' ');
    const words = await this.wordRepository.find({
      where: { songId: song.id },
    });
    for (let i = 0; i < words.length - expressionWords.length + 1; i++) {
      const segment = words.slice(i, i + expressionWords.length);
      if (segment.map((w) => w.text).join(' ') === expression) {
        matches.push({ index: i });
      }
    }
    this.logger.log('searchExpression completed');
    return matches;
  }

  async getStatistics(): Promise<any> {
    this.logger.log('getStatistics called');
    const words = await this.wordRepository.find();

    const totalWords = words.length;
    const totalChars = words.reduce((sum, word) => sum + word.text.length, 0);

    const totalRows = new Set(words.map((word) => word.rowIndex)).size;
    const totalParagraphs = new Set(words.map((word) => word.paragraphIndex))
      .size;

    const result = {
      averageCharsPerWord: totalChars / totalWords,
      averageCharsPerRow: totalChars / totalRows,
      averageCharsPerParagraph: totalChars / totalParagraphs,
      averageWordsPerParagraph: totalWords / totalParagraphs,
    };
    this.logger.log('getStatistics completed');
    return result;
  }

  async getWordOccurrences(): Promise<any[]> {
    return;
  }

  private getContext(word: Word): string {
    // Fetch a few words before and after the current word in its song.
    return `...`; // Context logic to fetch surrounding words
  }
}
