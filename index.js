const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

app.use(cors());

// Store timestamps for each room ID
const roomTimestamps = {};

const { Aptos, Account, AccountAddress, AptosConfig, Network, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

  const roomIds = [2, 3, 4, 5, 6, 7];

  const checkRoomStatus = async (roomId) => {
    const config = new AptosConfig({ network: Network.RANDOMNET });
    const aptosClient = new Aptos(config);
  
    try {
      const checkRoomResponse = await aptosClient.view({
        payload: {
          function: `${'0x0d17fdba4bd420569cb5b7a086a2d4b7e4a5857c89b846c6e795dd5b0fd4c217'}::dapp::get_room`,
          functionArguments: [roomId.toString()],
        },
      });
  
      const room = checkRoomResponse[0];
      if (room && typeof room === 'object' && room.players_list && Array.isArray(room.players_list) && room.players_list.length >= 5) {

        console.log(`This is the room for room ${roomId}`, room)

        setTimeout(() => {
          handleUpdateRoom(roomId);
        }, 2000 * roomId);

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
    const max_gas_amount = 60000
    const gas_unit_price = 100

    const transaction = await aptosClient.transaction.build.simple({
        sender: '0x70a5294493afd96cca25b3b139e62280c9c98c70a8e8e71fe1594a2a64d2b444',
        data: {
          function: `${'0x0d17fdba4bd420569cb5b7a086a2d4b7e4a5857c89b846c6e795dd5b0fd4c217'}::dapp::update_room`,
          typeArguments: [],
          functionArguments: [roomId.toString()],
        },
        options: {
          maxGasAmount: max_gas_amount,
          gasUnitPrice: gas_unit_price
        }
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
      for (const roomId of roomIds) {
        await checkRoomStatus(roomId);
        //await new Promise(resolve => setTimeout(resolve, 2000));
        //await handleUpdateRoom(roomId);
      }
      console.log("All rooms updated.");
    } catch (error) {
      console.error("Error updating rooms:", error);
    }
  };

  updateRooms();
  setInterval(updateRooms, 30000);

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
  
