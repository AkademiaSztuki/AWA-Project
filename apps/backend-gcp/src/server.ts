import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { pool } from './db';
import { participantsRouter } from './routes/participants';
import { swipesRouter } from './routes/swipes';
import { generationsRouter } from './routes/generations';
import { imagesRouter } from './routes/images';
import { researchRouter } from './routes/research';
import { gcsImagesRouter } from './routes/gcs-images';
import { spacesRouter } from './routes/spaces';
import { creditsRouter } from './routes/credits';
import { billingRouter } from './routes/billing';
import { authRouter } from './routes/auth';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'backend-gcp', env: process.env.NODE_ENV || 'development' });
});

// Debug: typ kolumny auth_user_id + czy backend łączy się przez socket Cloud SQL
const dbHost = process.env.CLOUD_SQL_CONNECTION_NAME ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}` : '(DATABASE_URL host)';
app.get('/api/debug/participants-auth-column', async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'auth_user_id'`
      );
      return res.json({
        data_type: rows[0]?.data_type ?? 'column_not_found',
        connection: process.env.CLOUD_SQL_CONNECTION_NAME ? 'socket' : 'tcp',
      });
    } finally {
      client.release();
    }
  } catch (e: unknown) {
    const err = e as Error;
    return res.status(500).json({
      error: err?.message ?? String(e),
      hint: !process.env.CLOUD_SQL_CONNECTION_NAME
        ? 'Ustaw CLOUD_SQL_CONNECTION_NAME i --add-cloudsql-instances przy deployu (łączenie przez socket).'
        : 'Sprawdź w Cloud Run → Logi czy przy starcie jest "[db] connection mode: Cloud SQL socket".',
      connection_expected: dbHost,
    });
  }
});

app.use('/api', authRouter);
app.use('/api', participantsRouter);
app.use('/api', swipesRouter);
app.use('/api', generationsRouter);
app.use('/api', imagesRouter);
app.use('/api', researchRouter);
app.use('/api', gcsImagesRouter);
app.use('/api', spacesRouter);
app.use('/api', creditsRouter);
app.use('/api', billingRouter);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`backend-gcp listening on port ${port}`);
});

