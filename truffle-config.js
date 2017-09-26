require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 4400000,
      gasPrice: 2100000000000,
    },
    testrpc: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 4400000,
      gasPrice: 2100000000000,
    },
    private: {
      host: 'localhost', // set IP for private network
      port: 8545,
      network_id: '10', // Match any network id
      gas: 4400000,
      gasPrice: 2100000000000,
    },
  },
};
