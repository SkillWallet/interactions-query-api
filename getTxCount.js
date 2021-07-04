const { Validator } = require('@chainlink/external-adapter')
const { default: axios } = require('axios')

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
  userAddresses: ['userAddresses'],
  contractAddress: ['contractAddress'],
  startBlock: ['start', 'startBlock'],
  chainID: ['chainId', 'chainID'],
  covalentAPIKey: ['covalentAPIKey', 'apiKey', 'covalentKey'],
  endpoint: false,
}

const getTxCount = async (input, callback) => {
  console.log('chainlink adapter called')
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const userAddresses = validator.validated.data.userAddresses;
  const contractAddress = validator.validated.data.contractAddress
  const startBlock = validator.validated.data.startBlock
  const chainID = validator.validated.data.chainID
  const covalentAPIKey = validator.validated.data.covalentAPIKey
  console.log('parameter validation passed')

  let finished = false
  let pageNumber = 0
  let pageSize = 1000000000
  let txCountPerUser = {}
    for (var userAddress of userAddresses ) {
    while (!finished) {
      const url = `https://api.covalenthq.com/v1/${chainID}/address/${userAddress}/transactions_v2/?&key=${covalentAPIKey}&no-logs=true&page-size=${pageSize}&page-number=${pageNumber}`
      const result = await axios.get(url)
      if (result.data.data.items.length > 0) {
        txCountPerUser[userAddress] = txCountPerUser[userAddress] ?? 0;
        txCountPerUser[userAddress] += result.data.data.items.filter(
          (tx) =>
            tx.to_address &&
            tx.block_height > startBlock &&
            tx.to_address == contractAddress
        ).length
      } else finished = true
      pageNumber++
    }
  }

  const response = {
    jobRunID: jobRunID,
    data: { txCountPerUser },
    result: txCountPerUser,
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
