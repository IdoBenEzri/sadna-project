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
}
