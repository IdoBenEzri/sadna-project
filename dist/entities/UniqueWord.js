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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueWord = void 0;
const typeorm_1 = require("typeorm");
const Word_1 = require("./Word");
const GroupOfWords_1 = require("./GroupOfWords");
const Song_1 = require("./Song");
let UniqueWord = class UniqueWord {
};
exports.UniqueWord = UniqueWord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", String)
], UniqueWord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UniqueWord.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Song_1.Song, (song) => song.uniqueWords),
    __metadata("design:type", Song_1.Song)
], UniqueWord.prototype, "song", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Word_1.Word, (word) => word.uniqueWord),
    __metadata("design:type", Array)
], UniqueWord.prototype, "words", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GroupOfWords_1.GroupOfWords, (groupOfWords) => groupOfWords.uniqueWord),
    __metadata("design:type", Array)
], UniqueWord.prototype, "groupAssociations", void 0);
exports.UniqueWord = UniqueWord = __decorate([
    (0, typeorm_1.Entity)()
], UniqueWord);
//# sourceMappingURL=UniqueWord.js.map