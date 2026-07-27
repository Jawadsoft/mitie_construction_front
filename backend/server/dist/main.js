"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    const port = process.env.PORT ? Number(process.env.PORT) : 4000;
    await app.listen(port, '0.0.0.0');
    console.log(`Server running on 0.0.0.0:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map