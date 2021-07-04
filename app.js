const getIntereactionsCount = require('./getTxCount').getTxCount

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.EA_PORT || 7080

app.use(bodyParser.json())

app.post('/getTxCount', (req, res) => {
  console.log('POST Data: ', req.body)
  getIntereactionsCount(req.body, (status, result) => {
    console.log('Result: ', result)
    res.status(status).json(result)
  })
})

app.listen(port, () => console.log(`Listening on port ${port}!`))