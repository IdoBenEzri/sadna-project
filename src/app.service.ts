import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as xml2js from 'xml2js';
import * as fs from 'fs/promises';

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

  async uploadSong({filename, data, name, authors, composers, singers}: any): Promise<string> {
    // Create and save the song first
    const song = this.songRepository.create({ filename });
    song.name = name;
    song.authors = authors.split(',');
    song.composers = composers.split(',');
    song.singers = singers.split(',');
    
    const savedSong = await this.songRepository.save(song);
    
    // Decode base64 data
    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    
    // Split content into lines and words
    const lines = decodedData.split('\n');
    
    // Process each line
    for (let paragraphIndex = 0; paragraphIndex < lines.length; paragraphIndex++) {
      const line = lines[paragraphIndex];
      const words = line.trim().split(/\s+/);
      
      // Skip empty lines but maintain paragraph indexing
      if (words.length === 1 && words[0] === '') continue;
      
      // Process each word in the line
      for (let inRowIndex = 0; inRowIndex < words.length; inRowIndex++) {
        const wordText = words[inRowIndex];
        if (!wordText) continue; // Skip empty words
        
        // Create word entity
        const word = this.wordRepository.create({
          text: wordText,
          song: savedSong,
          rowIndex: paragraphIndex,
          paragraphIndex: paragraphIndex,
          inRowIndex: inRowIndex,
        });
        
        // Check if unique word exists by text only
        let uniqueWord = await this.uniqueWordRepository.findOne({
          where: { text: wordText }
        });
        
        // Create unique word if it doesn't exist
        if (!uniqueWord) {
          uniqueWord = this.uniqueWordRepository.create({
            text: wordText
          });
          await this.uniqueWordRepository.save(uniqueWord);
        }
        
        // Associate word with unique word
        word.uniqueWord = uniqueWord;
        await this.wordRepository.save(word);
      }
    }
    
    return savedSong.id;
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

  async getSongs(query: { words?: string, composers?: string, singers?: string, authors?: string, name?: string }): Promise<any[]> {
    const qb = this.songRepository.createQueryBuilder('song');
    
    // Always join with words to include them in the result
    qb.leftJoin('song.words', 'word')
      .addSelect(['word.text', 'word.rowIndex', 'word.paragraphIndex', 'word.inRowIndex'])
      .orderBy('word.paragraphIndex', 'ASC')
      .addOrderBy('word.rowIndex', 'ASC')
      .addOrderBy('word.inRowIndex', 'ASC');
    
    // Add filtering conditions
    if (query.words) {
      qb.andWhere('word.text IN (:...words)', {
        words: query.words.split('.'),
      });
    }
    
    if (query.composers)
      qb.andWhere('song.composers IN (:...composers)', {
        composers: query.composers.split('.'),
      }); 
    if (query.singers)
      qb.andWhere('song.singers IN (:...singers)', {
        singers: query.singers.split('.'),
      }); 
    if (query.authors)
      qb.andWhere('song.authors IN (:...authors)', {
        authors: query.authors.split('.'),
      }); 
    if (query.name)
      qb.andWhere('song.name IN (:...name)', {
        name: query.name.split('.'),
      }); 

    // Add distinct to avoid duplicate songs
    qb.distinct(true);
    
    const songs = await qb.getMany();
    
    // Transform the results to include text organized by paragraphs
    return songs.map(song => {
      const paragraphs = {};
      song.words.forEach(word => {
        if (!paragraphs[word.paragraphIndex]) {
          paragraphs[word.paragraphIndex] = [];
        }
        paragraphs[word.paragraphIndex].push(word.text);
      });

      console.log(paragraphs);
      
      return {
        ...song,
        text: Object.values(paragraphs).map((paragraph: string[]) => paragraph.join(' '))
          ?.join('\n\n')
      };
    });
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

  async backupToXml(filepath: string): Promise<void> {
    // Fetch all data from database
    const songs = await this.songRepository.find({
      relations: ['words', 'words.uniqueWord']
    });
    const groups = await this.groupOfWordsRepository.find({
      relations: ['uniqueWord']
    });
    const expressions = await this.expressionRepository.find();

    // Create XML structure
    const backup = {
      database: {
        songs: songs.map(song => ({
          id: song.id,
          name: song.name,
          filename: song.filename,
          authors: song.authors,
          composers: song.composers,
          singers: song.singers,
          words: song.words.map(word => ({
            id: word.id,
            text: word.text,
            rowIndex: word.rowIndex,
            paragraphIndex: word.paragraphIndex,
            inRowIndex: word.inRowIndex,
            uniqueWord: {
              id: word.uniqueWord.id,
              text: word.uniqueWord.text
            }
          }))
        })),
        groups: groups.map(group => ({
          id: group.groupId,
          name: group.name,
          uniqueWord: group.uniqueWord ? {
            id: group.uniqueWord.id,
            text: group.uniqueWord.text
          } : null
        })),
        expressions: expressions.map(expr => ({
          id: expr.id,
          text: expr.text
        }))
      }
    };

    // Convert to XML and save
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(backup);
    await fs.writeFile(filepath, xml);
  }

  async restoreFromXml(filepath: string): Promise<void> {
    // Read and parse XML file
    const xml = await fs.readFile(filepath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(xml);

    // Clear existing data in correct order
    await this.wordRepository.delete({});
    await this.groupOfWordsRepository.delete({});
    await this.expressionRepository.delete({});
    await this.uniqueWordRepository.delete({});
    await this.songRepository.delete({});

    // Create a map to track unique words we've already created
    const uniqueWordsMap = new Map<string, UniqueWord>();

    // Restore data
    for (const songData of data.database.songs) {
      const song = this.songRepository.create({
        id: songData.id,
        name: songData.name,
        filename: songData.filename,
        authors: songData.authors,
        composers: songData.composers,
        singers: songData.singers
      });
      await this.songRepository.save(song);

      for (const wordData of songData.words) {
        // Check if we already created this unique word
        let uniqueWord = uniqueWordsMap.get(wordData.uniqueWord.text);

        if (!uniqueWord) {
          // Create new unique word
          uniqueWord = this.uniqueWordRepository.create({
            id: wordData.uniqueWord.id,
            text: wordData.uniqueWord.text
          });
          await this.uniqueWordRepository.save(uniqueWord);
          uniqueWordsMap.set(wordData.uniqueWord.text, uniqueWord);
        }

        // Create word
        const word = this.wordRepository.create({
          id: wordData.id,
          text: wordData.text,
          rowIndex: wordData.rowIndex,
          paragraphIndex: wordData.paragraphIndex,
          inRowIndex: wordData.inRowIndex,
          song: song,
          uniqueWord: uniqueWord
        });
        await this.wordRepository.save(word);
      }
    }

    // Restore groups
    if (data.database.groups) {
      for (const groupData of data.database.groups) {
        const uniqueWord = groupData.uniqueWord ? 
          uniqueWordsMap.get(groupData.uniqueWord.text) : null;

        const group = this.groupOfWordsRepository.create({
          groupId: groupData.id,
          name: groupData.name,
          uniqueWord: uniqueWord
        });
        await this.groupOfWordsRepository.save(group);
      }
    }

    // Restore expressions
    if (data.database.expressions) {
      for (const exprData of data.database.expressions) {
        const expression = this.expressionRepository.create({
          id: exprData.id,
          text: exprData.text
        });
        await this.expressionRepository.save(expression);
      }
    }
  }
}
