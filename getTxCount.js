const { Validator } = require('@chainlink/external-adapter')
const { default: axios } = require('axios')
var eccryptoJS = require('eccrypto-js')

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  userAddress: ['userAddress'],
  contractAddress: ['contractAddress'],
  startBlock: ['start', 'startBlock'],
  chainID: ['chainId', 'chainID'],
  endpoint: false,
}
const covalentAPIKey = 'ckey_aae01fa51e024af3a2634d9d030'
const getTxCount = async (input, callback) => {
  console.log('chainlink adapter called')
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const userAddress = validator.validated.data.userAddress
  const contractAddress = validator.validated.data.contractAddress
  const startBlock = validator.validated.data.startBlock
  const chainID = validator.validated.data.chainID
  console.log('parameter validation passed')

  let finished = false
  let totalTx = 0
  let pageNumber = 0
  let pageSize = 1000000000
  // let pageSize = 100
  while (!finished) {
    const url = `https://api.covalenthq.com/v1/${chainID}/address/${userAddress}/transactions_v2/?&key=${covalentAPIKey}&no-logs=true&page-size=${pageSize}&page-number=${pageNumber}`
    const result = await axios.get(url)
    if (result.data.data.items.length > 0) {
      console.log(result.data.data.items.map((z) => z.to_address))
      console.log(
        result.data.data.items.filter(
          (z) =>
            z.to_address &&
            z.to_address == contractAddress &&
            z.block_height > startBlock,
        ),
      )
      totalTx += result.data.data.items.filter(
        (tx) =>
          tx.to_address &&
          tx.block_height > startBlock &&
          tx.to_address == contractAddress,
      ).length
    } else finished = true
    pageNumber++
    console.log('pageNum', pageNumber)
    console.log('totalTx', totalTx)
  }

  const response = {
    jobRunID: jobRunID,
    data: { totalTx },
    result: totalTx,
    statusCode: 200,
  }

  callback(200, response)
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  getIntereactionsCount(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  getIntereactionsCount(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  getIntereactionsCount(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false,
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.getTxCount = getTxCount
