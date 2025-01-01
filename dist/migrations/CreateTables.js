"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTables = void 0;
class CreateTables {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "song" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "filename" varchar NOT NULL,
                "name" varchar NOT NULL,
                "author" varchar NOT NULL,
                "composers" text[] NOT NULL,
                "singers" text[] NOT NULL,
                "created_at" TIMESTAMP DEFAULT now()
            );
        `);
        await queryRunner.query(`
            CREATE TABLE "unique_word" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "text" varchar NOT NULL,
                "song_id" uuid,
                FOREIGN KEY ("song_id") REFERENCES "song" ("id")
            );
        `);
        await queryRunner.query(`
            CREATE TABLE "word" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "text" varchar NOT NULL,
                "row_index" integer NOT NULL,
                "paragraph_index" integer NOT NULL,
                "in_row_index" integer NOT NULL,
                "song_id" uuid,
                "unique_word_id" uuid,
                FOREIGN KEY ("song_id") REFERENCES "song" ("id"),
                FOREIGN KEY ("unique_word_id") REFERENCES "unique_word" ("id")
            );
        `);
        await queryRunner.query(`
            CREATE TABLE "group_of_words" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "group_id" varchar NOT NULL,
                "name" varchar NOT NULL,
                "unique_word_id" uuid,
                FOREIGN KEY ("unique_word_id") REFERENCES "unique_word" ("id")
            );
        `);
        await queryRunner.query(`
            CREATE TABLE "expression" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "text" varchar NOT NULL,
                "unique_word_id" uuid,
                FOREIGN KEY ("unique_word_id") REFERENCES "unique_word" ("id")
            );
        `);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "expression";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "group_of_words";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "word";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "unique_word";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "song";`);
    }
}
exports.CreateTables = CreateTables;
//# sourceMappingURL=CreateTables.js.map