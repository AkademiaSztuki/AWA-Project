import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { participantsRouter } from './routes/participants';
import { swipesRouter } from './routes/swipes';
import { generationsRouter } from './routes/generations';
import { imagesRouter } from './routes/images';
import { researchRouter } from './routes/research';
import { gcsImagesRouter } from './routes/gcs-images';
import { surveysRouter } from './routes/surveys';
import { creditsRouter } from './routes/credits';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'backend-gcp', env: process.env.NODE_ENV || 'development' });
});

app.use('/api', participantsRouter);
app.use('/api', swipesRouter);
app.use('/api', generationsRouter);
app.use('/api', imagesRouter);
app.use('/api', researchRouter);
app.use('/api', gcsImagesRouter);
app.use('/api', surveysRouter);
app.use('/api', creditsRouter);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`backend-gcp listening on port ${port}`);
});

