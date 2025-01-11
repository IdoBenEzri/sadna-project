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

  async uploadSongs({fileNames, data}: any): Promise<string[]> {
    const savedSongIds = [];
    
    // Process each song
    for (let i = 0; i < fileNames.length; i++) {
      const filename = fileNames[i];
      const songData = data[i]; 
      
      // Create and save the song first
      const song = this.songRepository.create({ filename });      
      // Decode base64 data
      const decodedData = Buffer.from(songData, 'base64').toString('utf-8');
      console.log(decodedData);
      // Split content into lines
      const lines = decodedData.split('\n');
      const name = lines[0];
      const authors = lines[1];
      const composers = lines[2];
      const singers = lines[3];
      
      // Update song metadata
      song.name = name;
      song.authors = authors.split(',').map(a => a.trim());
      song.composers = composers.split(',').map(c => c.trim());
      song.singers = singers.split(',').map(s => s.trim());
      const savedSong = await this.songRepository.save(song);
      
      // Process each line starting from line 4 (after metadata)
      for (let paragraphIndex = 4; paragraphIndex < lines.length; paragraphIndex++) {
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
            text: wordText.trim().toLowerCase(), // Normalize words to lowercase
            song: savedSong,
            rowIndex: paragraphIndex,
            paragraphIndex: paragraphIndex,
            inRowIndex: inRowIndex,
          });
          
          // Check if unique word exists by text only
          let uniqueWord = await this.uniqueWordRepository.findOne({
            where: { text: wordText.trim().toLowerCase() }
          });
          
          // Create unique word if it doesn't exist
          if (!uniqueWord) {
            uniqueWord = this.uniqueWordRepository.create({
              text: wordText.trim().toLowerCase()
            });
            await this.uniqueWordRepository.save(uniqueWord);
          }
          
          // Associate word with unique word
          word.uniqueWord = uniqueWord;
          await this.wordRepository.save(word);
        }
      }
      
      savedSongIds.push(savedSong.id);
    }
    
    return savedSongIds;
  }

  async getWords(query: {
    rowIndex?: string;
    inlineIndex?: string;
    paragraphIndex?: string;
    song_ids?: string;
  }): Promise<any[]> {
    const qb = this.wordRepository.createQueryBuilder('word')
      .leftJoinAndSelect('word.song', 'song')
      .addSelect(['song.id', 'song.name']);

    // Add conditions only if the values are defined and valid
    if (query.rowIndex) {
      const rowIndex = parseInt(query.rowIndex, 10);
      if (!isNaN(rowIndex)) {
        qb.andWhere('word.rowIndex = :rowIndex', { rowIndex });
      }
    }

    if (query.inlineIndex) {
      const inlineIndex = parseInt(query.inlineIndex, 10);
      if (!isNaN(inlineIndex)) {
        qb.andWhere('word.inRowIndex = :inlineIndex', { inlineIndex });
      }
    }

    if (query.paragraphIndex) {
      const paragraphIndex = parseInt(query.paragraphIndex, 10);
      if (!isNaN(paragraphIndex)) {
        qb.andWhere('word.paragraphIndex = :paragraphIndex', { paragraphIndex });
      }
    }

    if (query.song_ids) {
      const songIds = typeof query.song_ids === 'string'
        ? query.song_ids.split(',').filter(id => id && id !== 'undefined')
        : [];

      if (songIds.length > 0) {
        qb.andWhere('song.id IN (:...song_ids)', { song_ids: songIds });
      }
    }

    return qb.getMany();
  }

  async getSongs(query: { words?: string, composers?: string, singers?: string, authors?: string, name?: string, songId?: string }): Promise<any[]> {
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
    if (query.songId)
      qb.andWhere('song.id = :songId', {
        songId: query.songId,
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

  async getWordContext(word: string, songId: string, contextSize: number = 20): Promise<any[]> {
    // Debug logs
    console.log('Search parameters:', { word, songId });

    // First, let's see what words we actually have in the database
    const sampleWords = await this.wordRepository.find({
      take: 10,
      relations: ['song'],
    });
    console.log('Sample words in DB:', sampleWords.map(w => w.text));

    // Try to find the word with case-insensitive search
    const words = await this.wordRepository
      .createQueryBuilder('word')
      .leftJoinAndSelect('word.song', 'song')
      .where('LOWER(word.text) = LOWER(:text)', { text: word.trim() })
      .andWhere('song.id = :songId', { songId })
      .getMany();

    // Debug logs
    console.log('Found words:', words);

    // Try a simpler query if no words found
    if (!words.length) {
      console.log('No words found with first query, trying simpler query...');
      const allWordsInSong = await this.wordRepository.find({
        where: { 
          song: { id: songId }
        },
        relations: ['song'],
      });
      console.log('All words in song:', allWordsInSong.map(w => w.text));
    }

    // If no valid songId or no words found, return empty array
    if (!songId || songId === 'undefined' || !words.length) {
      return [];
    }

    // Get all words from the song ordered by their position
    const allSongWords = await this.wordRepository.find({
      where: { 
        song: { id: songId }
      },
      order: { 
        paragraphIndex: 'ASC',
        rowIndex: 'ASC',
        inRowIndex: 'ASC'
      }
    });

    return words.map((targetWord) => {
      console.log('Processing target word:', targetWord);
      
      // Find the index of the target word in allSongWords
      const wordIndex = allSongWords.findIndex(w => 
        w.id === targetWord.id
      );
      console.log('Found word index:', wordIndex);

      // Get context words before and after
      const startIndex = Math.max(0, wordIndex - contextSize);
      const endIndex = Math.min(allSongWords.length, wordIndex + contextSize + 1);
      
      // Get the context words
      const contextWords = allSongWords.slice(startIndex, endIndex);

      return {
        word: targetWord.text,
        songId: targetWord.song.id,
        songName: targetWord.song.name,
        contextInSong: contextWords.map(w => {
          if (w.id === targetWord.id) {
            return `**${w.text}**`; // Highlight the target word
          }
          return w.text;
        }).join(' '),
        position: {
          paragraphIndex: targetWord.paragraphIndex,
          rowIndex: targetWord.rowIndex,
          inRowIndex: targetWord.inRowIndex
        }
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
    const words = await this.wordRepository.find({
      relations: ['song']
    });

    const totalWords = words.length;
    const totalChars = words.reduce((sum, word) => sum + word.text.length, 0);

    const totalRows = new Set(words.map((word) => word.rowIndex)).size;
    const totalParagraphs = new Set(words.map((word) => word.paragraphIndex)).size;

    // Calculate per-song statistics
    const songStats = words.reduce((acc, word) => {
      const songId = word.song.id;
      if (!acc[songId]) {
        acc[songId] = {
          chars: 0,
          words: 0,
          rows: new Set()
        };
      }
      acc[songId].chars += word.text.length;
      acc[songId].words += 1;
      acc[songId].rows.add(word.rowIndex);
      return acc;
    }, {} as Record<string, { chars: number; words: number; rows: Set<number> }>);

    // Calculate averages per song
    const songsCount = Object.keys(songStats).length;
    const avgCharsPerSong = Math.round(Object.values(songStats).reduce((sum, stat) => sum + stat.chars, 0) / songsCount);
    const avgWordsPerSong = Math.round(Object.values(songStats).reduce((sum, stat) => sum + stat.words, 0) / songsCount);
    const avgWordsPerRow = Math.round(totalWords / totalRows);

    return {
      averageCharsPerWord: Math.round(totalChars / totalWords),
      averageCharsPerRow: Math.round(totalChars / totalRows),
      averageCharsPerParagraph: Math.round(totalChars / totalParagraphs),
      averageWordsPerParagraph: Math.round(totalWords / totalParagraphs),
      averageCharsPerSong: avgCharsPerSong,
      averageWordsPerSong: avgWordsPerSong,
      averageWordsPerRow: avgWordsPerRow,
    };
  }

  async getWordOccurrences(): Promise<{words: string[], occurrences: number[]}> {
    // Get all words with their text
    const words = await this.wordRepository.find({
      select: ['text']
    });

    // Count occurrences of each word
    const wordFrequency = words.reduce((acc, {text}) => {
      acc[text] = (acc[text] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Split into two arrays
    const words_array = Object.keys(wordFrequency);
    const occurrences_array = Object.values(wordFrequency);

    return {
      words: words_array,
      occurrences: occurrences_array
    };
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
