import * as express from 'express';
import { Express } from 'express';
import router from './router';

const app: Express = express();
const port = Number(process.env.APP_PORT) || 3000;

app.use(router);

app.listen(port, () => console.log(`Application started on port ${port}`));
