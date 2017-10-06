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
    rinkeby: {
      host: 'localhost', // Connect to geth on the specified
      port: 8545,
      from: '0x8ebCf0196E689377C01f64D27e8F96028b21a47a', // default address to use for any transaction Truffle makes during migrations
      network_id: 4,
      gas: 4400000,
      gasPrice: 2100000000000,
    },
  },
};
