import * as express from 'express';
import { Express } from 'express';
import router from './router';
import { testRouter } from './app/test/router';

const app: Express = express();
const port = Number(process.env.APP_PORT) || 3000;

app.use(express.json());
app.use(router);
app.use('/api/test', testRouter());
app.listen(port, () => console.log(`Application started on port ${port}`));
