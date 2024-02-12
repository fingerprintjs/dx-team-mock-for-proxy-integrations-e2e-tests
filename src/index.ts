import * as express from 'express';
import { Express } from 'express';
import { proxyReceiverRouter } from './app/proxy-receiver/router';
import { testRouter } from './app/test/router';
import router from './router';
import beforeResponseMiddleware from './middlewares/beforeResponse.middleware';

const app: Express = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(beforeResponseMiddleware(console.info));
app.use(router);
app.use(proxyReceiverRouter());
app.use('/api/test', testRouter());
app.listen(port, () => console.log(`Application started on port ${port}`));
