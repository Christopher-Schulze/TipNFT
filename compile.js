const fs = require('fs');
const solc = require('solc');

function findImports(path) {
  try {
    return { contents: fs.readFileSync('node_modules/' + path, 'utf8') };
  } catch (e) {
    try {
      return { contents: fs.readFileSync(path, 'utf8') };
    } catch (err) {
      return { error: 'File not found' };
    }
  }
}

const files = ['contracts/TipNFT.sol', 'contracts/Reenter.sol'];
const sources = {};
for (const file of files) {
  sources[file] = { content: fs.readFileSync(file, 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
if (output.errors) {
  for (const e of output.errors) console.error(e.formattedMessage);
}
for (const file of files) {
  const name = file.split('/')[1].replace('.sol', '');
  const contract = output.contracts[file][name];
  fs.mkdirSync(`artifacts/contracts/${file.split('/')[1]}`, { recursive: true });
  const artifact = {
    _format: 'hh-sol-artifact-1',
    contractName: name,
    sourceName: file,
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
    deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
    linkReferences: {},
    deployedLinkReferences: {}
  };
  fs.writeFileSync(`artifacts/contracts/${file.split('/')[1]}/${name}.json`, JSON.stringify(artifact, null, 2));
}
