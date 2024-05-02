const express = require('express');
const app = express();
const cors = require('cors');
const axios = require('axios');
const port = process.env.PORT || 3001;

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const yargs = require("yargs");
const {
  initiateUserControlledWalletsClient,
} = require("@circle-fin/user-controlled-wallets");

require("dotenv").config();

const client = initiateUserControlledWalletsClient({
  apiKey: process.env.API_KEY,
});

const baseUrl = 'https://api.circle.com/v1/w3s';

const contAddress = '0xd5c2933b8b6c84857e5881ee78218033893f3362';

const devwalletId = '33b0c2bf-1156-5b21-95b3-a98fece399e3';

console.log(process.env.API_KEY)
console.log("started")

app.use(cors({ origin: '*' }));

username = {}

// #Step 1 - Create a new user
async function createNewUser(username) {
  try {
    let response = await client.createUser({
      userId: username, // Use the provided username for userId
    });

    console.log(response);
    return response; // Return the response for the server to send back
  } catch (error) {
    throw error; // Re-throw the error for the server to handle
  }
}

// #Step 2 - Create session token
async function createSessionToken(username) {
  try {
    let response = await client.createUserToken({
      userId: username,
    });

    console.log(response.data);
    return response;
  } catch (error){
    throw error;
  }
}

// #Step 3 - Create Challenge for Wallet Creation
async function createChallengeForWalletCreation(existingUser, userToken) {
  try {
    let response = await client.createUserPinWithWallets({
      userId: existingUser,
      blockchains: ["ETH-SEPOLIA"], // Assuming this is the fixed blockchain value
      userToken: userToken,
    });

    console.log(response.data?.challengeId);
    return response.data?.challengeId;
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
}


// #Step 4 - Create Challenge for SCA Wallet Creation
async function createChallengeForSCAWalletCreation(existingUser, userToken) {
  try {
    let response = await client.createUserPinWithWallets({
      userId: existingUser,
      blockchains: ["ETH-SEPOLIA"], // Assuming this is the fixed blockchain value
      accountType: 'SCA',
      userToken: userToken,
    });

    console.log(response.data?.challengeId);
    return response.data?.challengeId;
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
}


// Function to get user's wallet ID
async function getUserWalletID(userToken) {
  try {
    const response = await axios.get(`${baseUrl}/wallets`, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        'X-User-Token': userToken // Include X-User-Token with userToken value
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user wallet ID:', error);
    throw error;
  }
}

// Function to get user's token Balances for Wallet
async function getWalletBalances(walletId, userToken) {
  try {
    const response = await axios.get(`${baseUrl}/wallets/${walletId}/balances`, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        'X-User-Token': userToken
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error getting user wallet ID:', error);
    throw error;
  }
}

// Function to get create challenge for Token Transfer
async function outboundTransfer(userToken, amount, walletId, recipientAdd, tokenId) {
  try {

    const { v4: uuidv4 } = require('uuid'); // Assuming Node.js environment
    const idempotencyKey = uuidv4();

    const response = await axios.post(`${baseUrl}/user/transactions/transfer`, {
      amounts: [
        amount
      ],
      nftTokenIds: [],
      destinationAddress: recipientAdd,
      feeLevel: "MEDIUM",
      idempotencyKey: idempotencyKey,
      refId: "<reference id>",
      tokenId: tokenId,
      walletId: walletId
    }, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        'X-User-Token': userToken
      }
    });
    console.log(response)
    return response.data?.data;
  } catch (error) {
    console.error('Error performing outbound transfer:', error);
    throw error;
  }
}


async function getUsers(userToken) {
  try {
    const response = await axios.get(`${baseUrl}/users`, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        'X-User-Token': userToken
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error getting users for Nexus Wallet:', error);
    throw error;
  }
}

async function challengeRecoverAcc(userToken) {
  try {

    const { v4: uuidv4 } = require('uuid'); // Assuming Node.js environment
    const idempotencyKey = uuidv4();

    const response = await axios.post(`${baseUrl}/user/pin/restore`, {
      
      idempotencyKey: idempotencyKey
      }, {

      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        'X-User-Token': userToken
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error getting users for Nexus Wallet:', error);
    throw error;
  }
}

// Get Users NFTs
async function getNFTs(walletId) {
  try {
    const response = await axios.get(`${baseUrl}/wallets/${walletId}/nfts`, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error getting Nfts for this User:', error);
    throw error;
  }
}


// Function to Mint NFT to User Wallet Address
async function mintNFT(walletAdd, URI) {
  try {
    const { v4: uuidv4 } = require('uuid'); // Assuming Node.js environment
    const idempotencyKey = uuidv4();

    const forge = require('node-forge')
    const entitySecret = forge.util.hexToBytes('4e3fb8137e076af1a4467de1a64a3922927ba308daf25e736d5191a7804820c2')
    const publicKey = forge.pki.publicKeyFromPem('-----BEGIN RSA PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtfoR/z++4IgAvZsLyS7k\n55dVIbYakLdIC8/I6szvPwvhkC5/5cDqpQXgwKqhpOBmu95eCPbUpOO7YL9+F8/9\n8Og0l+HSQXlHFYvlQv6LVmS1a760SREAyluZ3XKsUwFrv0c0vqSl10nTffume6Og\nMSJ/Zs4XtyMkenK/5BT1YcvxkJuvW2KupVELUZb3AT4n3xK/WRQ0Sbbr3S44ts7A\nOYsx3fyay4x0f3u8VrhBwWzfx/eUQgKOQYPLHiPvtITKEh0EDgKjI0IleZVtfZlL\nYkhUYGIFcEefF0UaiD5l/TDt/Os6xXCL6sCclK+8zeMGYQke4LUbRw5MRhoeH9pE\nBYb6GrITnUUhhYncWd2zg+dUm7Mjsjnz7rvYXNBx/Iq9m8Kcd2+dApnVbfrmJtlW\ntMm9asHElEBWrpJUGTZ76zjP8F2hJkmQI6chVR3D6FZ7RZvP4VGV7vVlEx1OFLp7\nPlfeHloQW/3ua3x5HFGD5aym00PDUmwnE6/yDmMi4hX8ncUxcwqzfrXXGAuElKF8\nmc+U/dKuRJRrWbP+Q53wRdKlriGrZArXiLIBbJv/LhoL3vkgwWqW+zjHooflcp+W\nmuTgy9UmepHJ5wK9TwH54v7BK2YTVh5hH3i4UJF/uHdBn8a9IgL07IDktkZ1FdZF\nHQHirufmKFESrerLpSdD3QcCAwEAAQ==\n-----END RSA PUBLIC KEY-----\n')
    const encryptedData = publicKey.encrypt(entitySecret, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    })
    const cipherText = forge.util.encode64(encryptedData)
    const response = await axios.post(`${baseUrl}/developer/transactions/contractExecution`, {
      abiParameters: [
        `${walletAdd}`, `${URI}`
      ],
      abiFunctionSignature: `mintTo(address,string)`,
      contractAddress: contAddress,
      entitySecretCiphertext: cipherText,
      feeLevel: "MEDIUM",
      idempotencyKey: idempotencyKey,
      refId: "<reference id>",
      walletId: devwalletId
    }, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`
      }
    });
    console.log(response)
    return response.data?.data;
  } catch (error) {
    console.error('Error performing outbound transfer:', error);
    throw error;
  }
}



app.get('/createUser/:username', async (req, res) => {
  const { username } = req.params;
  // Retrieve the timestamp for the specified roomId from roomTimestamps object
  try {
    const response = await createNewUser(username);
    const userData = {
      status: response.status, // Assuming userId is a property in the response
      statusText: response.statusText,
      message: 'User created successfully!'
    };
    res.status(201).json({ data: userData });
  } catch (error) {
    console.error('Error creating user:', error);
    let errorMessage;
    if (error.response && error.response.status === 500) {
      errorMessage = 'Internal Server Error'; // Customize the message for 500 error
      res.status(500).json({ message: errorMessage });
    } else {
      errorMessage = error.response.data.message || 'Existing user already created with the provided userId';
      res.status(409).json({ message: errorMessage });
    }
  }
});

app.get('/createSession/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const response = await createSessionToken(username);

    const resData = {
      userToken: response.userToken,
      encryptionKey: response.encryptionKey
    };
    console.log(response)

    res.status(200).json(response.data);
 } catch (error) {
   console.error('Error creating user:', error);
   let errorMessage;
   if(error.response && error.response.status === 400){
    errorMessage = 'Bad Request. Api Parameter Invalid';
    res.status(400).json({message: errorMessage})
   }
   else if(error.response && error.response.status === 404) {
    errorMessage = 'Cannot find the userId in the system';
    res.status(404).json({ message: errorMessage });
  }
  else{
    errorMessage = 'Network Issue. Please try Again';
    res.json({ message: errorMessage });
  }
 }
});


app.get('/createChallenge/:existingUser/:walletSelection/:userToken', async (req, res) => {
  const { existingUser, walletSelection, userToken } = req.params;

  try {
    let challengeId;
    if (walletSelection === 'EOA') {
      // Call createChallengeForWalletCreation() for EOA wallet selection
      challengeId = await createChallengeForWalletCreation(existingUser, userToken);
    } else if (walletSelection === 'SCA') {
      // Call createChallengeForSCAWalletCreation() for SCA wallet selection
      challengeId = await createChallengeForSCAWalletCreation(existingUser, userToken);
    } else {
      // Invalid wallet selection
      throw new Error('Invalid wallet selection');
    }
    console.log(challengeId)
    res.status(200).json({ challengeId });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Error creating challenge' });
  }
});

// Route to handle the request for fetching user's wallet ID
app.get('/getWalletID/:userToken', async (req, res) => {
  const { userToken } = req.params;
  try {
    const walletsData = await getUserWalletID(userToken);
    // Send the wallets data back to the frontend
    res.status(200).json(walletsData);
  } catch (error) {
    console.error('Error getting user wallet ID:', error);
    res.status(500).json({ error: 'Error getting user wallet ID' });
  }
});


// Route to handle the request for fetching token Balance for Wallet
app.get('/getTokenBalances/:walletId/:userToken', async (req, res) => {
  const { walletId, userToken } = req.params;
  try {
    const walletsData = await getWalletBalances(walletId, userToken);
    // Send the wallets data back to the frontend
    res.status(200).json(walletsData);
  } catch (error) {
    console.error('Error getting user wallet ID:', error);
    res.status(500).json({ error: 'Error getting user wallet ID' });
  }
});

// Route to handle creating a challenge for outbound token Transfer
app.get('/outboundTransfer/:userToken/:amount/:walletId/:recipientAdd/:tokenId', async (req, res) => {
  const { userToken, amount, walletId, recipientAdd, tokenId } = req.params;
  try {
    const trfRes = await outboundTransfer(userToken, amount, walletId, recipientAdd, tokenId);
    // Send the wallets data back to the frontend
    console.log(trfRes)
    res.status(200).json({ trfRes });
  } catch (error) {
    console.error('Error during outbound Transfer:', error);
    res.status(500).json({ error: 'Error creating Outbound Transfer Challenge' });
  }
});

app.get('/getUsers/:userToken', async (req, res) => {
  const { userToken } = req.params;
  try {
    const response = await getUsers(userToken);
    // Send the wallets data back to the frontend
    console.log(response)
    res.status(200).json({ response });
  } catch (error) {
    console.error('Error getting Users:', error);
    res.status(500).json({ error: 'Error getting User List' });
  }
});

app.get('/recoverAcc/:userToken', async (req, res) => {
  const { userToken } = req.params;
  try {
    const response = await challengeRecoverAcc(userToken);
    // Send the wallets data back to the frontend
    console.log(response)
    res.status(200).json({ response });
  } catch (error) {
    console.error('Error creating Recovery Challenge:', error);

    if (error.response && error.response.status === 500) {
      errorMessage = 'Internal Server Error';
      res.status(500).json({ message: errorMessage });
    } else {
      errorMessage = error.response.data.message || 'Existing user already created with the provided userId';
      res.status(401).json({ error: 'Malformed authorization. Is the authorization type missing' });
    }
  }
});

app.get('/getNFTs/:walletId', async (req, res) => {
  const { walletId } = req.params;
  try {
    const response = await getNFTs(walletId);
    // Send the wallets data back to the frontend
    console.log(response)
    res.status(200).json({ response });
  } catch (error) {
    console.error('Error getting User NFTs:', error);
    res.status(500).json({ error: 'Error getting NFTs' });
  }
});

app.get('/mintNFT/:walletAddress/:uri', async (req, res) => {
  const { walletAddress, uri } = req.params;
  console.log(walletAddress)
  console.log(uri)
  try {
    const response = await mintNFT(walletAddress, uri);
    // Send the wallets data back to the frontend
    console.log(response)
    res.status(200).json({ response });
  } catch (error) {
    console.error('Encountered Error while trying to MINT:', error);
    res.status(500).json({ error: 'Encountered Error while trying to MINT NFT' });
  }
});


io.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

let connectedClients = new Set();

io.on('connection', (socket) => {
    connectedClients.add(socket.id);
    
    console.log('Client connected');

    // Store notifications
    let notifications = [];
  
    app.post('/notify', async (req, res) => {
      const notificationData = req.body;
      console.log('Received notification:', notificationData);
  
      // Add notification to the list
      notifications.push(notificationData);
  
      // if (socket.connected) {
        console.log("sent notification")
        // Emit the notification data to the connected client
        //socket.emit('notification', notificationData);
      //}
      for (const clientId of connectedClients) {
        socket.to(clientId).emit('notification', notificationData);
       }
  
      // Send a successful response back to Circle (usually a 200 status code)
      res.sendStatus(200);
    });

    socket.on('disconnect', () => {
        connectedClients.delete(socket.id);
    });
});


  http.listen(port, "0.0.0.0", () => {
    console.log(`App listening on port: ${port}`);
  });



  // yargs
  // .scriptName("circle_server")
  // .usage("$0 <cmd> [args]")

  // .command(
  //   "create-user",
  //   "Create a new user",
  //   () => {},
  //   (argv) => {
  //     createNewUser();
  //   }
  // )

  // .command(
  //   "create-token",
  //   "Create a session token",
  //   () => {},
  //   (argv) => {
  //     createSessionToken();
  //   }
  // )

  // .command(
  //   "create-challenge-wallet",
  //   "Create Challenge to Create Wallet",
  //   () => {},
  //   (argv) => {
  //     createChallengeForWalletCreation();
  //   }
  // )

  // .command(
  //   "create-challenge-sca-wallet",
  //   "Create Challenge to Create SCA Wallet",
  //   () => {},
  //   (argv) => {
  //     createChallengeForSCAWalletCreation();
  //   }
  // )
