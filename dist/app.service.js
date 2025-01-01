"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const entities_1 = require("./entities");
let AppService = class AppService {
    constructor(songRepository, wordRepository, uniqueWordRepository, groupOfWordsRepository, expressionRepository) {
        this.songRepository = songRepository;
        this.wordRepository = wordRepository;
        this.uniqueWordRepository = uniqueWordRepository;
        this.groupOfWordsRepository = groupOfWordsRepository;
        this.expressionRepository = expressionRepository;
    }
    async uploadSong({ filename, data, name, authors, composers, singers }) {
        const song = this.songRepository.create({ filename });
        song.name = name;
        song.author = authors;
        song.composers = composers.split(',');
        song.singers = singers.split(',');
        const savedSong = await this.songRepository.save(song);
        const decodedData = Buffer.from(data, 'base64').toString('utf-8');
        const lines = decodedData.split('\n');
        for (let paragraphIndex = 0; paragraphIndex < lines.length; paragraphIndex++) {
            const line = lines[paragraphIndex];
            const words = line.trim().split(/\s+/);
            if (words.length === 1 && words[0] === '')
                continue;
            for (let inRowIndex = 0; inRowIndex < words.length; inRowIndex++) {
                const wordText = words[inRowIndex];
                if (!wordText)
                    continue;
                const word = this.wordRepository.create({
                    text: wordText,
                    song: savedSong,
                    rowIndex: paragraphIndex,
                    paragraphIndex: paragraphIndex,
                    inRowIndex: inRowIndex,
                });
                await this.wordRepository.save(word);
                let uniqueWord = await this.uniqueWordRepository.findOne({
                    where: { text: wordText, song: { id: savedSong.id } },
                    relations: ['song'],
                });
                if (!uniqueWord) {
                    uniqueWord = this.uniqueWordRepository.create({
                        text: wordText,
                        song: savedSong,
                    });
                    await this.uniqueWordRepository.save(uniqueWord);
                }
                word.uniqueWord = uniqueWord;
                await this.wordRepository.save(word);
            }
        }
        return savedSong.id;
    }
    async getWords(query) {
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
    async getWordContext(word) {
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
    async createGroupOfWords(name, words) {
        const group = this.groupOfWordsRepository.create({
            name,
            groupId: Date.now().toString(),
            uniqueWord: null,
        });
        await this.groupOfWordsRepository.save(group);
    }
    async getGroups() {
        const groups = await this.groupOfWordsRepository.find();
        return groups.map((group) => group.name);
    }
    async getGroupIndexes(groupId) {
        const group = await this.groupOfWordsRepository.findOne({
            where: { groupId },
            relations: ['uniqueWord'],
        });
        if (!group)
            throw new Error('Group not found');
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
    async addExpression(expression) {
        const expr = this.expressionRepository.create({ text: expression });
        await this.expressionRepository.save(expr);
    }
    async searchExpression(expression, songId) {
        const song = await this.songRepository.findOne({
            where: { id: songId },
            relations: ['words'],
        });
        if (!song)
            throw new Error('Song not found');
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
    async getStatistics() {
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
    async getWordOccurrences() {
        const songs = await this.songRepository.find({ relations: ['words'] });
        return songs.map((song) => ({
            songId: song.id,
            songName: song.name,
            occurrencesNum: song.words.length,
        }));
    }
    getContext(word) {
        return `...`;
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(entities_1.Song)),
    __param(1, (0, typeorm_2.InjectRepository)(entities_1.Word)),
    __param(2, (0, typeorm_2.InjectRepository)(entities_1.UniqueWord)),
    __param(3, (0, typeorm_2.InjectRepository)(entities_1.GroupOfWords)),
    __param(4, (0, typeorm_2.InjectRepository)(entities_1.Expression)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository])
], AppService);
//# sourceMappingURL=app.service.js.map