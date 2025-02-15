import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as xml2js from 'xml2js';
import * as fs from 'fs/promises';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { v4 as uuid } from 'uuid';
import { Brackets } from 'typeorm';
import { ILike } from 'typeorm';

import { Song, Word, UniqueWord, GroupOfWords, Expression } from './entities';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,

    @InjectRepository(Word)
    private readonly  wordRepository: Repository<Word>,

    @InjectRepository(UniqueWord)
    private readonly uniqueWordRepository: Repository<UniqueWord>,

    @InjectRepository(GroupOfWords)
    private readonly groupOfWordsRepository: Repository<GroupOfWords>,

    @InjectRepository(Expression)
    private readonly expressionRepository: Repository<Expression>,
  ) {}

  async uploadSongs({fileNames, data}: any): Promise<string[]> {
    const savedSongIds = [];
    
    for (let i = 0; i < fileNames.length; i++) {
      const filename = fileNames[i];
      const songData = data[i]; 
      
      const song = this.songRepository.create({ filename });      
      const decodedData = Buffer.from(songData, 'base64').toString('utf-8');
      const lines = decodedData.split('\n');
      
      // Handle metadata - store as comma-separated strings
      song.name = lines[0].trim();
      song.authors = lines[1].split(',').map(a => a.trim()).filter(Boolean);
      song.composers = lines[2].split(',').map(c => c.trim()).filter(Boolean);
      song.singers = lines[3].split(',').map(s => s.trim()).filter(Boolean);
      
      const savedSong = await this.songRepository.save(song);
      await this.parseSongContent(decodedData, savedSong);
      
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

  async getSongs(query: { 
    words?: string, 
    composers?: string, 
    singers?: string, 
    authors?: string, 
    name?: string, 
    songId?: string,
    expression?: string 
  }): Promise<any[]> {
    // Start building the query
    let qb = this.songRepository.createQueryBuilder('song');

    // If searching by words, ensure the song contains the word
    if (query.words && query.words.trim()) {
      qb.innerJoin('song.words', 'filterWord', 'LOWER(filterWord.text) = LOWER(:word)', { word: query.words.toLowerCase().trim() });
    }

    // Apply metadata filters
    if (query.name) {
      qb.andWhere('LOWER(song.name) LIKE LOWER(:name)', { 
        name: `%${query.name.toLowerCase().trim()}%` 
      });
    }

    // Use array operations for searching
    if (query.composers) {
      const composerTerms = query.composers.toLowerCase().split(',').map(c => c.trim()).filter(Boolean);
      qb.andWhere(`
        EXISTS (
          SELECT 1 FROM unnest(song.composers) composer
          WHERE LOWER(composer) IN (:...composerTerms)
        )
      `, { 
        composerTerms: composerTerms
      });
    }

    if (query.singers) {
      const singerTerms = query.singers.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      qb.andWhere(`
        EXISTS (
          SELECT 1 FROM unnest(song.singers) singer
          WHERE LOWER(singer) IN (:...singerTerms)
        )
      `, { 
        singerTerms: singerTerms
      });
    }

    if (query.authors) {
      const authorTerms = query.authors.toLowerCase().split(',').map(a => a.trim()).filter(Boolean);
      qb.andWhere(`
        EXISTS (
          SELECT 1 FROM unnest(song.authors) author
          WHERE LOWER(author) IN (:...authorTerms)
        )
      `, { 
        authorTerms: authorTerms
      });
    }

    if (query.songId) {
      qb.andWhere('song.id = :songId', { songId: query.songId });
    }

    // Include all words for the matched songs
    qb.leftJoinAndSelect('song.words', 'word');

    // Apply ordering
    qb.orderBy('word.paragraphIndex', 'ASC')
      .addOrderBy('word.rowIndex', 'ASC')
      .addOrderBy('word.inRowIndex', 'ASC');
    
    // Execute the query
    const songs = await qb.getMany();

    // If searching by expression, process accordingly
    if (query.expression && query.expression !== 'null') {
      const expressionWords = query.expression.toLowerCase().split(' ').filter(w => w.trim());
      const filteredSongs = [];
      console.log('Expression words:', expressionWords);
      for (const song of songs) {
        // Sort words by their position
        const orderedWords = song.words.sort((a, b) => {
          if (a.paragraphIndex !== b.paragraphIndex) {
            return a.paragraphIndex - b.paragraphIndex;
          }
          if (a.rowIndex !== b.rowIndex) {
            return a.rowIndex - b.rowIndex;
          }
          return a.inRowIndex - b.inRowIndex;
        });

        // Find expression matches
        const matches = [];
        for (let i = 0; i < orderedWords.length - expressionWords.length + 1; i++) {
          let isMatch = true;
          const currentWord = orderedWords[i];
          const matchedPositions = [];

          for (let j = 0; j < expressionWords.length; j++) {
            const nextWord = orderedWords[i + j];
            if (!nextWord || nextWord.text.toLowerCase() !== expressionWords[j]) {
              isMatch = false;
              break;
            }
            matchedPositions.push({
              paragraphIndex: nextWord.paragraphIndex,
              rowIndex: nextWord.rowIndex,
              inRowIndex: nextWord.inRowIndex
            });
          }

          if (isMatch) {
            matches.push({
              positions: matchedPositions,
              matchedText: expressionWords.join(' '),
              startPosition: {
                paragraphIndex: currentWord.paragraphIndex,
                rowIndex: currentWord.rowIndex,
                inRowIndex: currentWord.inRowIndex
              },
              endPosition: {
                paragraphIndex: orderedWords[i + expressionWords.length - 1].paragraphIndex,
                rowIndex: orderedWords[i + expressionWords.length - 1].rowIndex,
                inRowIndex: orderedWords[i + expressionWords.length - 1].inRowIndex
              }
            });
          }
        }

        if (matches.length > 0) {
          // Organize words into paragraphs and rows for display
          const paragraphs: Record<number, Record<number, string[]>> = {};
          orderedWords.forEach(word => {
            if (!paragraphs[word.paragraphIndex]) {
              paragraphs[word.paragraphIndex] = {};
            }
            if (!paragraphs[word.paragraphIndex][word.rowIndex]) {
              paragraphs[word.paragraphIndex][word.rowIndex] = [];
            }
            paragraphs[word.paragraphIndex][word.rowIndex].push(word.text);
          });

          filteredSongs.push({
            id: song.id,
            name: song.name,
            filename: song.filename,
            composers: song.composers,
            singers: song.singers,
            authors: song.authors,
            matches: matches,
            text: Object.entries(paragraphs)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([_, rows]) => 
                Object.entries(rows)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([_, words]) => words.join(' '))
                  .join('\n')
              )
              .join('\n\n')
          });
        }
      }
      return filteredSongs;
    }

    // Format the songs with all their words
    return songs.map(song => {
      if (!song.words || song.words.length === 0) {
        return {
          id: song.id,
          name: song.name,
          filename: song.filename,
          composers: song.composers,
          singers: song.singers,
          authors: song.authors,
          text: ''
        };
      }

      const paragraphs: Record<number, Record<number, string[]>> = {};
      song.words.forEach(word => {
        if (!paragraphs[word.paragraphIndex]) {
          paragraphs[word.paragraphIndex] = {};
        }
        if (!paragraphs[word.paragraphIndex][word.rowIndex]) {
          paragraphs[word.paragraphIndex][word.rowIndex] = [];
        }
        paragraphs[word.paragraphIndex][word.rowIndex].push(word.text);
      });
      
      return {
        id: song.id,
        name: song.name,
        filename: song.filename,
        composers: song.composers,
        singers: song.singers,
        authors: song.authors,
        text: Object.entries(paragraphs)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([_, rows]) => 
            Object.entries(rows)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([_, words]) => words.join(' '))
              .join('\n')
          )
          .join('\n\n')
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

  async getUniqueWords(): Promise<string[]> {
    const uniqueWords = await this.uniqueWordRepository.find();
    return uniqueWords.map(word => word.text);
  }

  async getGroupWords(groupId: string): Promise<string[]> {
    const group = await this.groupOfWordsRepository.findOne({ where: { groupId } });
    if (!group) throw new Error('Group not found');
    return group.uniqueWord.words.map(word => word.text);
  }

  async createGroupOfWords(name: string, words: string[]): Promise<void> {
    const groupId =  uuid();

    for (const wordText of words) {
      let uniqueWord = await this.uniqueWordRepository.findOne({ where: { text: wordText.trim().toLowerCase() } });

      if (!uniqueWord) {
        uniqueWord = this.uniqueWordRepository.create({ text: wordText.trim().toLowerCase() });
        await this.uniqueWordRepository.save(uniqueWord);
      }

      const groupOfWords = this.groupOfWordsRepository.create({
      name,
        uniqueWord,
        groupId: groupId,
      });

      await this.groupOfWordsRepository.save(groupOfWords);
    }
    return groupId;
  }

  async addWordToGroup(groupId: string, words: string[]): Promise<void> {
    console.log('Adding words to group:', { groupId, words });
    for (const word of words) {
      const uniqueWord = await this.uniqueWordRepository.findOne({ where: { text: word.trim().toLowerCase() } });
      if (!uniqueWord) throw new Error('Unique word not found');
      const group = await this.groupOfWordsRepository.findOne({ where: { groupId } });
      if (!group) throw new Error('Group not found');
      const existingGroup = await this.groupOfWordsRepository.findOne({ where: { uniqueWord: uniqueWord, groupId: groupId } });
      if (!existingGroup) {
        const groupOfWords = this.groupOfWordsRepository.create({
          name: group.name,
          uniqueWord: uniqueWord,
          groupId: groupId,
        });
        await this.groupOfWordsRepository.save(groupOfWords);
      }
    }
  }

  async getAllGroupWords(): Promise<any[]> {
    const groups = await this.groupOfWordsRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.uniqueWord', 'uniqueWord')
      .select([
        'group.groupId',
        'group.name',
        'array_agg(uniqueWord.text) as words'
      ])
      .groupBy('group.groupId, group.name')
      .getRawMany();
    console.log('Groups:', groups);
    return groups.map(group => ({
      groupId: group.group_groupId,
      name: group.group_name,
      words: group.words || []
    }));
  }

  async getGroups(): Promise<string[]> {
    const groups = await this.groupOfWordsRepository.find();
    return groups.map((group) => group.name);
  }

  async getGroupIndexes(groupId: string): Promise<any[]> {
    const wordsInGroup = await this.groupOfWordsRepository.find({
      where: { groupId },
      relations: ['uniqueWord'],
    });
    if (!wordsInGroup.length) throw new Error('Group not found');

    const results = [];
    for (const wordInGroup of wordsInGroup) {
    const words = await this.wordRepository.find({
        where: { uniqueWord: wordInGroup.uniqueWord },
      relations: ['song'],
    });

    for (const word of words) {
        results.push({
          word: word.text,
        songName: word.song.name,
          songId: word.song.id,
        inlineIndex: word.inRowIndex,
        rowIndex: word.rowIndex,
        paragraphIndex: word.paragraphIndex,
      });
    }
    }
    return results;
  }

  async addExpression(expression: string): Promise<void> {
    // Split expression into words and clean them
    const words = expression.toLowerCase().split(' ').filter(w => w.trim());
    
    // Find unique words and collect their IDs
    const uniqueWordIds = [];
    for (const word of words) {
      const uniqueWord = await this.uniqueWordRepository.findOne({
        where: { text: word.trim() }
      });
      if (uniqueWord) {
        uniqueWordIds.push(uniqueWord.id);
      }
    }

    // Create and save the expression with the unique word IDs
    const expr = this.expressionRepository.create({ 
      text: expression,
      uniqueWordIds: uniqueWordIds 
    });
    await this.expressionRepository.save(expr);
  }

  async searchExpression(expression: string): Promise<any[]> {
    console.log('Searching for expression:', expression);
    
    // First, find the UniqueWords for the expression
    const expressionWords = expression.toLowerCase().split(' ');
    const uniqueWords = await this.uniqueWordRepository.find({
        where: expressionWords.map(word => ({
            text: ILike(word)
        }))
    });

    console.log('Found UniqueWords:', uniqueWords.map(w => ({ id: w.id, text: w.text })));

    // Verify we found all words in the expression
    if (uniqueWords.length !== expressionWords.length) {
        console.log('Not all words found in UniqueWords');
        return [];
    }

    // Get all songs with their words
    const songs = await this.songRepository.find({
        relations: ['words', 'words.uniqueWord']
    });
    if (!songs.length) throw new Error('No songs found');

    const matches = [];

    // Search through each song
    for (const song of songs) {
        console.log(`\nChecking song: ${song.name}`);
        
        // Get all words ordered by their position
        const orderedWords = song.words.sort((a, b) => {
            if (a.paragraphIndex !== b.paragraphIndex) {
                return a.paragraphIndex - b.paragraphIndex;
            }
            if (a.rowIndex !== b.rowIndex) {
                return a.rowIndex - b.rowIndex;
            }
            return a.inRowIndex - b.inRowIndex;
        });

        // Iterate through words in the song
        for (let i = 0; i < orderedWords.length - uniqueWords.length + 1; i++) {
            const currentWord = orderedWords[i];
            let isMatch = true;
            let matchDetails = [];

            // Check if we're at valid boundaries
            for (let j = 0; j < uniqueWords.length; j++) {
                const nextWord = orderedWords[i + j];
                
                matchDetails.push({
                    expectedId: uniqueWords[j].id,
                    expectedText: uniqueWords[j].text,
                    foundId: nextWord?.uniqueWord?.id,
                    foundText: nextWord?.text,
                    para: nextWord?.paragraphIndex,
                    row: nextWord?.rowIndex,
                    inRow: nextWord?.inRowIndex
                });

                // Check if words exist and match UniqueWord IDs
                if (!nextWord || !nextWord.uniqueWord || 
                    nextWord.uniqueWord.id !== uniqueWords[j].id) {
                    console.log('Word mismatch:', {
                        expected: uniqueWords[j].text,
                        expectedId: uniqueWords[j].id,
                        found: nextWord?.text,
                        foundId: nextWord?.uniqueWord?.id
                    });
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                console.log('Found match!', matchDetails);
                
                matches.push({
                    songId: song.id,
                    songName: song.name,
                    paragraphIndex: currentWord.paragraphIndex,
                    rowIndex: currentWord.rowIndex,
                    startIndex: currentWord.inRowIndex,
                    endIndex: currentWord.inRowIndex + uniqueWords.length - 1,
                    matchedText: orderedWords
                        .slice(i, i + uniqueWords.length)
                        .map(w => w.text)
                        .join(' '),
                    matchedIds: orderedWords
                        .slice(i, i + uniqueWords.length)
                        .map(w => w.uniqueWord.id)
                });
            }
        }
    }

    console.log(`Found ${matches.length} matches for expression "${expression}"`);
    return matches;
  }

  async getAllExpressions(): Promise<any[]> {
    const expressions = await this.expressionRepository.find();
    return expressions.map(expr => ({
      id: expr.id,
      text: expr.text,
      uniqueWordIds: expr.uniqueWordIds
    }));
  }

  async getStatistics(): Promise<any> {
    const words = await this.wordRepository.find({
      relations: ['song']
    });

    const totalWords = words.length;
    const totalChars = words.reduce((sum, word) => sum + word.text.length, 0);

    // Calculate per-song statistics including paragraphs and rows
    const songStats = words.reduce((acc, word) => {
      const songId = word.song.id;
      if (!acc[songId]) {
        acc[songId] = {
          chars: 0,
          words: 0,
          rows: new Set(),
          paragraphs: new Set()
        };
      }
      acc[songId].chars += word.text.length;
      acc[songId].words += 1;
      acc[songId].rows.add(`${word.paragraphIndex}-${word.rowIndex}`); // Track unique rows
      acc[songId].paragraphs.add(word.paragraphIndex);
      return acc;
    }, {} as Record<string, { 
      chars: number; 
      words: number; 
      rows: Set<string>; 
      paragraphs: Set<number> 
    }>);

    // Calculate totals
    const totalParagraphs = Object.values(songStats)
      .reduce((sum, stat) => sum + stat.paragraphs.size, 0);
    
    const totalRows = Object.values(songStats)
      .reduce((sum, stat) => sum + stat.rows.size, 0);

    // Calculate averages per song
    const songsCount = Object.keys(songStats).length;
    const avgWordsPerSong = Math.round(totalWords / songsCount);
    const avgCharsPerSong = Math.round(totalChars / songsCount);
    const avgWordsPerRow = Math.round(totalWords / totalRows);

    return {
      averageCharsPerWord: Math.round(totalChars / totalWords),
      averageCharsPerRow: Math.round(totalChars / totalRows),
      averageCharsPerParagraph: Math.round(totalChars / totalParagraphs),
      averageWordsPerParagraph: Math.round(totalWords / totalParagraphs),
      averageCharsPerSong: avgCharsPerSong,
      averageWordsPerSong: avgWordsPerSong,
      averageWordsPerRow: avgWordsPerRow,
      totalWords,
      totalRows,
      totalParagraphs,
      totalSongs: songsCount,
      // Add these for debugging if needed
      songsBreakdown: Object.entries(songStats).map(([songId, stats]) => ({
        songId,
        words: stats.words,
        rows: stats.rows.size,
        paragraphs: stats.paragraphs.size
      }))
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

  async backupToXml(filepath: string): Promise<void> {
    console.log('Starting backup process...');
    
    // Fetch all data from database with complete relations
    const uniqueWords = await this.uniqueWordRepository.find();
    console.log(`Found ${uniqueWords.length} unique words to backup`);
    
    const songs = await this.songRepository.find();
    console.log(`Found ${songs.length} songs to backup`);
    
    const words = await this.wordRepository.find({
        relations: ['song', 'uniqueWord']
    });
    console.log(`Found ${words.length} words to backup`);
    
    const groups = await this.groupOfWordsRepository.find({
        relations: ['uniqueWord']
    });
    console.log(`Found ${groups.length} groups to backup`);
    
    const expressions = await this.expressionRepository.find();
    console.log(`Found ${expressions.length} expressions to backup`);

    // Create XML structure
    const backup = {
        database: {
            uniqueWords: uniqueWords.map(uniqueWord => ({
                id: uniqueWord.id,
                text: uniqueWord.text
            })),
            songs: songs.map(song => ({
                id: song.id,
                name: song.name,
                filename: song.filename,
                authors: song.authors,
                composers: song.composers,
                singers: song.singers
            })),
            words: words.map(word => ({
                id: word.id,
                text: word.text,
                rowIndex: word.rowIndex,
                paragraphIndex: word.paragraphIndex,
                inRowIndex: word.inRowIndex,
                songId: word.song.id,
                uniqueWordId: word.uniqueWord.id
            })),
            groups: groups.map(group => ({
                id: group.id,
                groupId: group.groupId,
                name: group.name,
                uniqueWordId: group.uniqueWord?.id
            })),
            expressions: expressions.map(expr => ({
                id: expr.id,
                text: expr.text,
                uniqueWordIds: expr.uniqueWordIds
            }))
        }
    };

    // Convert to XML and save
    const builder = new xml2js.Builder({
        renderOpts: { pretty: true, indent: '  ' },
        xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
    const xml = builder.buildObject(backup);
    
    console.log('XML structure created, writing to file...');
    await fs.writeFile(filepath, xml);
    console.log('Backup completed successfully');
  }

  async restoreFromXml(filepath: string): Promise<void> {
    console.log('Starting restore process...');
    
    // Read and parse XML file
    const xml = await fs.readFile(filepath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(xml);
    
    // Clear existing data in correct order (due to foreign key constraints)
    console.log('Clearing existing data...');
    await this.wordRepository.delete({});
    await this.groupOfWordsRepository.delete({});
    await this.expressionRepository.delete({});
    await this.uniqueWordRepository.delete({});
    await this.songRepository.delete({});

    // Disable auto-increment sequence for the restore process
    await this.uniqueWordRepository.query('ALTER SEQUENCE unique_word_id_seq RESTART WITH 1');
    await this.wordRepository.query('ALTER SEQUENCE word_id_seq RESTART WITH 1');

    // Maps to store references
    const uniqueWordsMap = new Map<string, UniqueWord>();
    const songsMap = new Map<string, Song>();

    try {
        // 1. Restore UniqueWords first
        console.log('Restoring unique words...');
        const uniqueWords = Array.isArray(data.database.uniqueWords) 
            ? data.database.uniqueWords 
            : [data.database.uniqueWords];

        for (const uniqueWordData of uniqueWords) {
            // Create the unique word with the exact ID from backup
            await this.uniqueWordRepository.query(
                'INSERT INTO unique_word (id, text) VALUES ($1, $2)',
                [uniqueWordData.id, uniqueWordData.text]
            );
            
            // Fetch the saved unique word
            const savedUniqueWord = await this.uniqueWordRepository.findOne({
                where: { id: parseInt(uniqueWordData.id) }
            });
            
            uniqueWordsMap.set(String(savedUniqueWord.id), savedUniqueWord);
        }

        // Update the sequence to the max ID
        await this.uniqueWordRepository.query(`
            SELECT setval('unique_word_id_seq', COALESCE((SELECT MAX(id) FROM unique_word), 1));
        `);

        // 2. Restore Songs
        console.log('Restoring songs...');
        const songs = Array.isArray(data.database.songs) 
            ? data.database.songs 
            : [data.database.songs];

        for (const songData of songs) {
            const song = this.songRepository.create({
                id: songData.id,
                name: songData.name,
                filename: songData.filename,
                authors: Array.isArray(songData.authors) ? songData.authors : [songData.authors],
                composers: Array.isArray(songData.composers) ? songData.composers : [songData.composers],
                singers: Array.isArray(songData.singers) ? songData.singers : [songData.singers]
            });
            const savedSong = await this.songRepository.save(song);
            songsMap.set(String(savedSong.id), savedSong);
        }

        // 3. Restore Words
        console.log('Restoring words...');
        const words = Array.isArray(data.database.words) 
            ? data.database.words 
            : [data.database.words];

        for (const wordData of words) {
            const song = songsMap.get(String(wordData.songId));
            const uniqueWord = uniqueWordsMap.get(String(wordData.uniqueWordId));

            if (!song || !uniqueWord) {
                console.warn(`Missing references for word: ${wordData.text}`);
                continue;
            }

            // Insert word with exact ID from backup using correct column names
            await this.wordRepository.query(
                'INSERT INTO word (id, text, "rowIndex", "paragraphIndex", "inRowIndex", "songId", "uniqueWordId") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [
                    wordData.id,
                    wordData.text,
                    wordData.rowIndex,
                    wordData.paragraphIndex,
                    wordData.inRowIndex,
                    song.id,
                    uniqueWord.id
                ]
            );
        }

        // Update word sequence
        await this.wordRepository.query(`
            SELECT setval('word_id_seq', COALESCE((SELECT MAX(id) FROM word), 1));
        `);

        // 4. Restore Groups
        if (data.database.groups) {
            console.log('Restoring groups...');
            const groups = Array.isArray(data.database.groups) 
                ? data.database.groups 
                : [data.database.groups];

            for (const groupData of groups) {
                const uniqueWord = uniqueWordsMap.get(String(groupData.uniqueWordId));
                if (!uniqueWord) {
                    console.warn(`UniqueWord not found for group: ${groupData.name}`);
                    continue;
                }

                const group = this.groupOfWordsRepository.create({
                    id: groupData.id,
                    groupId: groupData.groupId,
                    name: groupData.name,
                    uniqueWord: uniqueWord
                });

                await this.groupOfWordsRepository.save(group);
            }
        }

        // 5. Restore Expressions
        if (data.database.expressions) {
            console.log('Restoring expressions...');
            const expressions = Array.isArray(data.database.expressions) 
                ? data.database.expressions 
                : [data.database.expressions];

            for (const exprData of expressions) {
                const expression = this.expressionRepository.create({
                    id: exprData.id,
                    text: exprData.text,
                    uniqueWordIds: Array.isArray(exprData.uniqueWordIds) 
                        ? exprData.uniqueWordIds 
                        : [exprData.uniqueWordIds]
                });

                await this.expressionRepository.save(expression);
            }
        }

        console.log('Restore process completed successfully');
    } catch (error) {
        console.error('Error during restore process:', error);
        throw error;
    }
  }

  async exportToXml(): Promise<string> {
    const words = await this.wordRepository.find();
    const groups = await this.groupOfWordsRepository.find();
    const songs = await this.songRepository.find();

    const data = {
      backup: {
        words: { word: words },
        groups: { group: groups },
        songs: { song: songs },
      },
    };

    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
    });
    const xmlContent = builder.build(data);
    
    return xmlContent;
  }

  async importFromXml(xmlContent: string): Promise<void> {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
    });
    
    const parsed = parser.parse(xmlContent);
    
    // Clear existing data
    await this.wordRepository.clear();
    await this.groupOfWordsRepository.clear();
    await this.songRepository.clear();
    
    // Import words
    if (parsed.backup.words?.word) {
      const words = Array.isArray(parsed.backup.words.word) 
        ? parsed.backup.words.word 
        : [parsed.backup.words.word];
      await this.wordRepository.save(words);
    }
    
    // Import groups
    if (parsed.backup.groups?.group) {
      const groups = Array.isArray(parsed.backup.groups.group)
        ? parsed.backup.groups.group
        : [parsed.backup.groups.group];
      await this.groupOfWordsRepository.save(groups);
    }
    
    // Import songs
    if (parsed.backup.songs?.song) {
      const songs = Array.isArray(parsed.backup.songs.song)
        ? parsed.backup.songs.song
        : [parsed.backup.songs.song];
      await this.songRepository.save(songs);
    }
  }

  async parseSongContent(content: string, song: Song): Promise<Word[]> {
    const words: Word[] = [];
    let paragraphIndex = 1;
    let rowIndex = 1;
    let inRowIndex = 1;

    // Split content into rows and skip the first 4 rows (metadata)
    const allRows = content.split('\n').slice(4);
    
    // Join remaining rows and split into paragraphs
    const remainingContent = allRows.join('\n');
    const paragraphs = remainingContent.split('\n\n');
    
    for (const paragraph of paragraphs) {
        if (paragraph.trim()) {
            const rows = paragraph.split('\n');
            for (const row of rows) {
                if (row.trim()) {
                    inRowIndex = 1;
                    const rowWords = row.trim().split(/\s+/);
                    for (const wordText of rowWords) {
                        if (wordText.trim()) {
                            // Clean the word text: remove punctuation and convert to lowercase
                            const cleanWordText = wordText.trim()
                                .toLowerCase()
                                .replace(/[.,]$/g, '')  // Remove trailing periods and commas
                                .replace(/^[.,]/g, ''); // Remove leading periods and commas

                            if (cleanWordText) {  // Only process if we still have text after cleaning
                                // Check if UniqueWord exists
                                let uniqueWord = await this.uniqueWordRepository.findOne({
                                    where: { text: cleanWordText }
                                });

                                // Create UniqueWord if it doesn't exist
                                if (!uniqueWord) {
                                    uniqueWord = this.uniqueWordRepository.create({
                                        text: cleanWordText
                                    });
                                    await this.uniqueWordRepository.save(uniqueWord);
                                }

                                // Create Word
                                const word = this.wordRepository.create({
                                    text: cleanWordText,
                                    song: song,
                                    paragraphIndex: paragraphIndex,
                                    rowIndex: rowIndex,
                                    inRowIndex: inRowIndex,
                                    uniqueWord: uniqueWord
                                });
                                await this.wordRepository.save(word);
                                words.push(word);
                                inRowIndex++;
                            }
                        }
                    }
                    rowIndex++;
                }
            }
            paragraphIndex++;
            rowIndex = 1;
        }
    }
    
    return words;
  }
}
