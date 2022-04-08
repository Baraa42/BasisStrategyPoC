require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('@nomiclabs/hardhat-truffle5');
require('dotenv').config();
require('hardhat-deploy');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('hardhat-contract-sizer');
require('hardhat-spdx-license-identifier');
require('hardhat-abi-exporter');
require('hardhat-storage-layout');
require('@openzeppelin/hardhat-upgrades');
require('@primitivefi/hardhat-marmite');

const fs = require("fs");

const {OPTIMISTIC_KOVAN_PRIVATE_KEY, OPTIMISTIC_PRIVATE_KEY, ALCHEMY_API_KEY, MAINNET_ETHERSCAN_KEY} = process.env;

task("fork_reset", "Reset to local fork", async (taskArgs) => {
    await network.provider.request({
        method: "hardhat_reset",
        params: [],
    });
});


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
      compilers: [
          {
              version: "0.8.4",
              settings: {
                  optimizer: {
                      enabled: true,
                      runs: 1000000,
                  },
                  outputSelection: {
                      "*": {
                          "*": ["storageLayout"],
                      },
                  },
              },
          },
          {
              version: "0.8.2",
              settings: {
                  optimizer: {
                      enabled: true,
                      runs: 1000000,
                  },
                  outputSelection: {
                      "*": {
                          "*": ["storageLayout"],
                      },
                  },
              },
          },
          {
              version: "0.7.6",
              settings: {
                  optimizer: {
                      enabled: true,
                      runs: 200,
                  },
              },
          },
          {
              version: "0.5.17",
              settings: {
                  optimizer: {
                      enabled: true,
                      runs: 1000000,
                  },
              },
          },
      ],
  },
    networks: {
        kovanoptimism: {
            url: `https://opt-kovan.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
            accounts: [`${OPTIMISTIC_KOVAN_PRIVATE_KEY}`]
        },
        optimism: {
            url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
            accounts: [`${OPTIMISTIC_PRIVATE_KEY}`]
        },
        localhost: {
            forking: {
                url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
                accounts: [`${OPTIMISTIC_PRIVATE_KEY}`]
            },
        }
    },
    etherscan: {
        apiKey: MAINNET_ETHERSCAN_KEY
  },
    gasReporter: {
    enable: true,
    currency: 'USD',
  },
    contractSizer: {
      alphaSort: true,
        disambiguatePaths: true,
        runOnCompile: true,
        strict: false,
    },
    spdxLicenseIdentifier: {
        overwrite: false,
        runOnCompile: true,
    },
     abiExporter: {
        path: './abi',
         runOnCompile: true,
         clear: true,
         flat: true,
         only: [''],
         spacing: 2,
         pretty: true,
    }
};


function getSortedFiles(dependenciesGraph) {
    const tsort = require("tsort")
    const graph = tsort()

    const filesMap = {}
    const resolvedFiles = dependenciesGraph.getResolvedFiles()
    resolvedFiles.forEach((f) => (filesMap[f.sourceName] = f))

    for (const [from, deps] of dependenciesGraph.entries()) {
        for (const to of deps) {
            graph.add(to.sourceName, from.sourceName)
        }
    }

    const topologicalSortedNames = graph.sort()

    // If an entry has no dependency it won't be included in the graph, so we
    // add them and then dedup the array
    const withEntries = topologicalSortedNames.concat(resolvedFiles.map((f) => f.sourceName))

    const sortedNames = [...new Set(withEntries)]
    return sortedNames.map((n) => filesMap[n])
}

function getFileWithoutImports(resolvedFile) {
    const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm

    return resolvedFile.content.rawContent.replace(IMPORT_SOLIDITY_REGEX, "").trim()
}

subtask("flat:get-flattened-sources", "Returns all contracts and their dependencies flattened")
    .addOptionalParam("files", undefined, undefined, types.any)
    .addOptionalParam("output", undefined, undefined, types.string)
    .setAction(async ({ files, output }, { run }) => {
        const dependencyGraph = await run("flat:get-dependency-graph", { files })
        console.log(dependencyGraph)

        let flattened = ""

        if (dependencyGraph.getResolvedFiles().length === 0) {
            return flattened
        }

        const sortedFiles = getSortedFiles(dependencyGraph)

        let isFirst = true
        for (const file of sortedFiles) {
            if (!isFirst) {
                flattened += "\n"
            }
            flattened += `// File ${file.getVersionedName()}\n`
            flattened += `${getFileWithoutImports(file)}\n`

            isFirst = false
        }

        // Remove every line started with "// SPDX-License-Identifier:"
        flattened = flattened.replace(/SPDX-License-Identifier:/gm, "License-Identifier:")

        flattened = `// SPDX-License-Identifier: MIXED\n\n${flattened}`

        // Remove every line started with "pragma experimental ABIEncoderV2;" except the first one
        flattened = flattened.replace(/pragma experimental ABIEncoderV2;\n/gm, ((i) => (m) => (!i++ ? m : ""))(0))
        // Remove every line started with "pragma abicoder v2;" except the first one
        flattened = flattened.replace(/pragma abicoder v2;\n/gm, ((i) => (m) => (!i++ ? m : ""))(0))
        // Remove every line started with "pragma solidity ****" except the first one
        flattened = flattened.replace(/pragma solidity .*$\n/gm, ((i) => (m) => (!i++ ? m : ""))(0))


        flattened = flattened.trim()
        if (output) {
            console.log("Writing to", output)
            fs.writeFileSync(output, flattened)
            return ""
        }
        return flattened
    })

subtask("flat:get-dependency-graph")
    .addOptionalParam("files", undefined, undefined, types.any)
    .setAction(async ({ files }, { run }) => {
        const sourcePaths = files === undefined ? await run("compile:solidity:get-source-paths") : files.map((f) => fs.realpathSync(f))

        const sourceNames = await run("compile:solidity:get-source-names", {
            sourcePaths,
        })

        const dependencyGraph = await run("compile:solidity:get-dependency-graph", { sourceNames })

        return dependencyGraph
    })

task("flat", "Flattens and prints contracts and their dependencies")
    .addOptionalVariadicPositionalParam("files", "The files to flatten", undefined, types.inputFile)
    .addOptionalParam("output", "Specify the output file", undefined, types.string)
    .setAction(async ({ files, output }, { run }) => {
        console.log(
            await run("flat:get-flattened-sources", {
                files,
                output,
            })
        )
    })
