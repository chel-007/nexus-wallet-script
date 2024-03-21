const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

app.use(cors());

// Store timestamps for each room ID
const roomTimestamps = {};

const { Aptos, Account, AccountAddress, AptosConfig, Network, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

  const roomIds = [7, 8, 9];

  const checkRoomStatus = async (roomId) => {
    const config = new AptosConfig({ network: Network.RANDOMNET });
    const aptosClient = new Aptos(config);
  
    try {
      const checkRoomResponse = await aptosClient.view({
        payload: {
          function: `${'0x60e5a00ffd3cf1ba4323bfa8f5ddbe1dea2c8f817607a5f89a32b28e5f16d37e'}::dapp::get_room`,
          functionArguments: [roomId.toString()],
        },
      });
  
      const room = checkRoomResponse[0];
      if (room && typeof room === 'object' && room.players_list && Array.isArray(room.players_list) && room.players_list.length >= 5) {

        console.log(`This is the room for room ${roomId}`, room)

        setTimeout(() => {
          handleUpdateRoom(roomId);
        }, 3000 * roomId);

      } else {
        console.log(`Room ${roomId} is not active or doesn't have enough players.`);
      }
    }
     catch (error) {
      console.error(error);
      // if (error.message.includes('Network Error')) {
      //   console.log("Network Error");
      // }
      if (error instanceof Error && error.message.includes('Failed to execute function')) {
        console.log("Room id does not exist in Module");
      }
    }
  };
  
  const handleUpdateRoom = async (roomId) => {

    const config = new AptosConfig({ network: Network.RANDOMNET });
    const aptosClient = new Aptos(config);
  
    console.log(roomId);
  
    const privateKey = new Ed25519PrivateKey("0xf1f2b0d537cb8de1f89603ebc7cd35ef4811b6aa5d181fdfdb062d523f771f4d");
    const address = AccountAddress.from("0x70a5294493afd96cca25b3b139e62280c9c98c70a8e8e71fe1594a2a64d2b444");
    const account = Account.fromPrivateKey({ privateKey, address });
    const transaction = await aptosClient.transaction.build.simple({
        sender: '0x70a5294493afd96cca25b3b139e62280c9c98c70a8e8e71fe1594a2a64d2b444',
        data: {
          function: `${'0x60e5a00ffd3cf1ba4323bfa8f5ddbe1dea2c8f817607a5f89a32b28e5f16d37e'}::dapp::update_room`,
          typeArguments: [],
          functionArguments: [roomId.toString()],
        },
      });
  
      try {
        const committedTransaction = await aptosClient.signAndSubmitTransaction({
          signer: account,
          transaction,
        });

        roomTimestamps[roomId] = Date.now();
        console.log(roomTimestamps[roomId])
  
        console.log(committedTransaction);
      } 
      
      catch (error) {
        console.error("Error encountered:", error);
        if (error instanceof Error && error.message.includes('Network Error')) {
          console.error("Network Error. Please reconnect and Reload the Room!");
        }
        else{
          console.log(`Room ${roomId} has this error`, error)
        }

      }
  };
  
  const updateRooms = async () => {
    try {
      const checkRoomStatusPromises = roomIds.map(roomId => checkRoomStatus(roomId));
      await Promise.all(checkRoomStatusPromises);
      console.log("All room statuses checked.");
    } catch (error) {
      console.error("Error updating rooms:", error);
    }
  };

  updateRooms();
  // setInterval(updateRooms, 30000);

  app.get('/roomTimestamp/:roomId', (req, res) => {
    const { roomId } = req.params;
    // Retrieve the timestamp for the specified roomId from roomTimestamps object
    const roomTimestamp = roomTimestamps[roomId] || Date.now();
    // Send the room timestamp as JSON response
    res.json({ roomTimestamp });
  });

  app.listen(port, () => {
    console.log(`App listening on port: ${port}`);
  });
  
