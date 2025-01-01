"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const config_1 = require("@nestjs/config");
const dotenv = require("dotenv");
dotenv.config();
const configService = new config_1.ConfigService();
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    synchronize: false,
    logging: true,
    entities: ["src/entities/*.ts"],
    migrations: ["src/migrations/*.ts"],
});
//# sourceMappingURL=data-source.js.map