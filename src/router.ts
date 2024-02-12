import * as express from 'express'

const router = express.Router()
router.get('/', (req, res) => {
  res.send('hello, world!').status(202)
})

export default router
