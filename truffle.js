module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
    },
    testrpc: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 4400000,
      gasPrice: 2100000000000
    }
  },
};
