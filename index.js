const { Aptos, Account, AccountAddress, AptosConfig, Network, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

const roomId = '4'; // Define the roomId here

const UpdateRoom = () => {
  const config = new AptosConfig({ network: Network.RANDOMNET });
  const aptosClient = new Aptos(config);

  console.log(roomId);

  const privateKey = new Ed25519PrivateKey("0xf1f2b0d537cb8de1f89603ebc7cd35ef4811b6aa5d181fdfdb062d523f771f4d");
  const address = AccountAddress.from("0x70a5294493afd96cca25b3b139e62280c9c98c70a8e8e71fe1594a2a64d2b444");
  
  const handleUpdateRoom = async () => {
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

      console.log(committedTransaction);
      console.log("Room update successful!");
    } catch (error) {
      console.error("Error encountered:", error);
      if (error instanceof Error && error.message.includes('Network Error')) {
        console.error("Network Error. Please reconnect and Reload the Room!");
      }
    }
  };

  // Run the function repeatedly at an interval
  // setInterval(() => {
  //   handleUpdateRoom();
  // }, 20000); // 10 seconds interval
};

UpdateRoom();
