import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import { AppModule } from './app.module';

// These packages export a CJS function as module.exports; namespace imports
// don't give a callable value under esModuleInterop, so require() them.
const session = require('express-session');
const cookieParser = require('cookie-parser');
const connectPgSimple = require('connect-pg-simple');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown fields — see MEMORY.md Section 13
      forbidNonWhitelisted: true, // rejects unknown fields outright
      transform: true,
    }),
  );

  app.use(cookieParser());

  // Session store backed by the same Postgres instance (no Redis dependency
  // for sessions in Phase 1A to keep the sandbox setup minimal; Redis is
  // still planned for caching/queues per MEMORY.md Section 03).
  const PgSession = connectPgSimple(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
      name: 'agency.sid',
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
      },
    }),
  );

  app.enableCors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
