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
exports.SongController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
let SongController = class SongController {
    constructor(AppService) {
        this.AppService = AppService;
    }
    async uploadSong(body) {
        console.log(body);
        const songId = await this.AppService.uploadSong(body);
        return { songId };
    }
    async getWords(query) {
        return this.AppService.getWords(query);
    }
    async getWordContext(word) {
        return this.AppService.getWordContext(word);
    }
    async createGroupOfWords(body) {
        await this.AppService.createGroupOfWords(body.name, body.words);
        return { message: 'Group of words created successfully' };
    }
    async getGroups() {
        return this.AppService.getGroups();
    }
    async getGroupIndexes(groupId) {
        return this.AppService.getGroupIndexes(groupId);
    }
    async addExpression(body) {
        await this.AppService.addExpression(body.expression);
        return { message: 'Expression added successfully' };
    }
    async searchExpression(body) {
        return this.AppService.searchExpression(body.expression, body.songId);
    }
    async getStatistics() {
        return this.AppService.getStatistics();
    }
    async getWordOccurrences() {
        return this.AppService.getWordOccurrences();
    }
};
exports.SongController = SongController;
__decorate([
    (0, common_1.Post)('upload'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SongController.prototype, "uploadSong", null);
__decorate([
    (0, common_1.Get)('words'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SongController.prototype, "getWords", null);
__decorate([
    (0, common_1.Get)('word/context'),
    __param(0, (0, common_1.Query)('word')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SongController.prototype, "getWordContext", null);
__decorate([
    (0, common_1.Post)('group-of-words'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SongController.prototype, "createGroupOfWords", null);
__decorate([
    (0, common_1.Get)('group-of-words'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SongController.prototype, "getGroups", null);
__decorate([
    (0, common_1.Get)('group-of-words/indexes'),
    __param(0, (0, common_1.Query)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SongController.prototype, "getGroupIndexes", null);
__decorate([
    (0, common_1.Post)('expression'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SongController.prototype, "addExpression", null);
__decorate([
    (0, common_1.Post)('expression/search'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SongController.prototype, "searchExpression", null);
__decorate([
    (0, common_1.Get)('statistics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SongController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('statistics/occurences'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SongController.prototype, "getWordOccurrences", null);
exports.SongController = SongController = __decorate([
    (0, common_1.Controller)('song'),
    __metadata("design:paramtypes", [app_service_1.AppService])
], SongController);
//# sourceMappingURL=app.controller.js.map