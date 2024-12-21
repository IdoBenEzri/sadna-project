import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Song, Word, UniqueWord, GroupOfWords, Expression } from './entities';

@Injectable()
export class AppService {
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
    const song = this.songRepository.create({ filename: file.filename });
    const savedSong = await this.songRepository.save(song);
    return savedSong.id;
  }

  async addExtraDetails(details: {
    songId: string;
    name: string;
    authors: string;
    composers: string;
    singers: string;
  }): Promise<void> {
    const song = await this.songRepository.findOne({
      where: { id: details.songId },
    });
    if (!song) throw new Error('Song not found');

    song.name = details.name;
    song.author = details.authors;
    song.composers = details.composers.split(',');
    song.singers = details.singers.split(',');

    await this.songRepository.save(song);
  }

  async getWords(query: {
    rowIndex?: number;
    inlineIndex?: number;
    paragraphIndex?: number;
    song_ids?: string;
  }): Promise<any[]> {
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

    return qb.getMany();
  }

  async getWordContext(word: string): Promise<any[]> {
    const words = await this.wordRepository.find({
      where: { text: word },
      relations: ['song'],
    });
    return words.map((w) => {
      const context = this.getContext(w);
      return {
        word: w.text,
        songId: w.song.id,
        songName: w.song.name,
        contextInSong: context,
      };
    });
  }

  async createGroupOfWords(name: string, words: string[]): Promise<void> {
    const group = this.groupOfWordsRepository.create({
      name,
      groupId: Date.now().toString(),
      uniqueWord: null,
    });
    await this.groupOfWordsRepository.save(group);
  }

  async getGroups(): Promise<string[]> {
    const groups = await this.groupOfWordsRepository.find();
    return groups.map((group) => group.name);
  }

  async getGroupIndexes(groupId: string): Promise<any> {
    const group = await this.groupOfWordsRepository.findOne({
      where: { groupId },
      relations: ['uniqueWord'],
    });
    if (!group) throw new Error('Group not found');

    const indexes = {};
    const words = await this.wordRepository.find({
      where: { uniqueWord: group.uniqueWord },
      relations: ['song'],
    });

    for (const word of words) {
      if (!indexes[word.text]) {
        indexes[word.text] = [];
      }
      indexes[word.text].push({
        songName: word.song.name,
        inlineIndex: word.inRowIndex,
        rowIndex: word.rowIndex,
        paragraphIndex: word.paragraphIndex,
      });
    }
    return indexes;
  }

  async addExpression(expression: string): Promise<void> {
    const expr = this.expressionRepository.create({ text: expression });
    await this.expressionRepository.save(expr);
  }

  async searchExpression(expression: string, songId: string): Promise<any[]> {
    const song = await this.songRepository.findOne({
      where: { id: songId },
      relations: ['words'],
    });
    if (!song) throw new Error('Song not found');

    const matches = [];
    const expressionWords = expression.split(' ');
    for (let i = 0; i < song.words.length - expressionWords.length + 1; i++) {
      const segment = song.words.slice(i, i + expressionWords.length);
      if (segment.map((word) => word.text).join(' ') === expression) {
        matches.push({ index: i });
      }
    }
    return matches;
  }

  async getStatistics(): Promise<any> {
    const words = await this.wordRepository.find();

    const totalWords = words.length;
    const totalChars = words.reduce((sum, word) => sum + word.text.length, 0);

    const totalRows = new Set(words.map((word) => word.rowIndex)).size;
    const totalParagraphs = new Set(words.map((word) => word.paragraphIndex))
      .size;

    return {
      averageCharsPerWord: totalChars / totalWords,
      averageCharsPerRow: totalChars / totalRows,
      averageCharsPerParagraph: totalChars / totalParagraphs,
      averageWordsPerParagraph: totalWords / totalParagraphs,
    };
  }

  async getWordOccurrences(): Promise<any[]> {
    const songs = await this.songRepository.find({ relations: ['words'] });
    return songs.map((song) => ({
      songId: song.id,
      songName: song.name,
      occurrencesNum: song.words.length,
    }));
  }

  private getContext(word: Word): string {
    // Fetch a few words before and after the current word in its song.
    return `...`; // Context logic to fetch surrounding words
  }
}
