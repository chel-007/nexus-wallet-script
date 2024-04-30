const express = require('express');
const app = express();
const cors = require('cors');
const axios = require('axios');
const port = process.env.PORT || 3001;

const yargs = require("yargs");
const {
  initiateUserControlledWalletsClient,
} = require("@circle-fin/user-controlled-wallets");

require("dotenv").config();

const client = initiateUserControlledWalletsClient({
  apiKey: process.env.API_KEY,
});

const baseUrl = 'https://api.circle.com/v1/w3s';

console.log(process.env.API_KEY)
console.log("started")

app.use(cors());

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


  app.listen(port, () => {
    console.log(`App listening on port: ${port}`);
  });



  yargs
  .scriptName("circle_server")
  .usage("$0 <cmd> [args]")

  .command(
    "create-user",
    "Create a new user",
    () => {},
    (argv) => {
      createNewUser();
    }
  )

  .command(
    "create-token",
    "Create a session token",
    () => {},
    (argv) => {
      createSessionToken();
    }
  )

  .command(
    "create-challenge-wallet",
    "Create Challenge to Create Wallet",
    () => {},
    (argv) => {
      createChallengeForWalletCreation();
    }
  )

  .command(
    "create-challenge-sca-wallet",
    "Create Challenge to Create SCA Wallet",
    () => {},
    (argv) => {
      createChallengeForSCAWalletCreation();
    }
  )
  
