window.addEventListener('load', async () => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
     if (window.ethereum) {
       const web3 = new Web3(window.ethereum);
       try {
         // Request account access if needed
         await window.ethereum.enable();
         // Acccounts now exposed
         return web3;
       } catch (error) {
         console.error(error);
       }
     }
     // Legacy dapp browsers...
     else if (window.web3) {
       // Use Mist/MetaMask's provider.
       const web3 = window.web3;
       console.log('Injected web3 detected.');
       return web3;
     }
     // Fallback to localhost; use dev console port by default...
     else {
       const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
       const web3 = new Web3(provider);
       console.log('No web3 instance injected, using Local web3.');
       return web3;
     }
   });