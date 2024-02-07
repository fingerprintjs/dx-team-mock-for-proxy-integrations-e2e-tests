import * as express from 'express';
import beforeResponseMiddleware from './middlewares/beforeResponse.middleware';

const router = express.Router();

router.get('/', beforeResponseMiddleware(console.log), (req, res) => {
  res.send('hello, world!').status(202);
});

export default router;
