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
exports.Word = void 0;
const typeorm_1 = require("typeorm");
const Song_1 = require("./Song");
const UniqueWord_1 = require("./UniqueWord");
let Word = class Word {
};
exports.Word = Word;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", String)
], Word.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Song_1.Song, (song) => song.words),
    __metadata("design:type", Song_1.Song)
], Word.prototype, "song", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Word.prototype, "rowIndex", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Word.prototype, "paragraphIndex", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Word.prototype, "inRowIndex", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Word.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UniqueWord_1.UniqueWord, (uniqueWord) => uniqueWord.words),
    __metadata("design:type", UniqueWord_1.UniqueWord)
], Word.prototype, "uniqueWord", void 0);
exports.Word = Word = __decorate([
    (0, typeorm_1.Entity)()
], Word);
//# sourceMappingURL=Word.js.map