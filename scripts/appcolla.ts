// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0

import assert from "assert";
import fs from "fs";
import path from "path";
import { NODE_URL, FAUCET_URL } from "./common";
import { AptosAccount, AptosClient, TxnBuilderTypes, MaybeHexString, HexString, FaucetClient, } from "aptos";
import { stringify } from "querystring";
import { exit } from "process";
/**
  This example depends on the MoonCoin.move module having already been published to the destination blockchain.

  One method to do so is to use the CLI:
      * Acquire the Aptos CLI, see https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli
      * `yarn your_coin ~/aptos-core/aptos-move/move-examples/moon_coin`.
      * Open another terminal and `aptos move compile --package-dir ~/aptos-core/aptos-move/move-examples/moon_coin --save-metadata --named-addresses MoonCoin=<Alice address from above step>`.
      * Return to the first terminal and press enter.
 */

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

class CollectionClient extends AptosClient {
  constructor() {
    super(NODE_URL);
  }

  /** Register the receiver account to receive transfers for the new coin. */
  async registerCoin(coinTypeAddress: HexString, coinReceiver: AptosAccount): Promise<string> {
    const rawTxn = await this.generateTransaction(coinReceiver.address(), {
      function: "0x1::managed_coin::register",
      type_arguments: [`${coinTypeAddress.hex()}::appcolla::CollInfo`],
      arguments: [],
    });

    const bcsTxn = await this.signTransaction(coinReceiver, rawTxn);
    const pendingTxn = await this.submitTransaction(bcsTxn);

    return pendingTxn.hash;
  }

  /** Mints the newly created coin to a specified receiver address */
  async setMesage(minter: AptosAccount, receiverAddress: HexString, msg: String): Promise<string> {
    const rawTxn = await this.generateTransaction(minter.address(), {
      function: `${minter.address()}::appcolla::write`,
      type_arguments: [],
      arguments: [msg],
    });

    const bcsTxn = await this.signTransaction(minter, rawTxn);
    const pendingTxn = await this.submitTransaction(bcsTxn);
    console.log(pendingTxn);
    return pendingTxn.hash;
  }

  /** Mints the newly created coin to a specified receiver address */
  async getMesage(minter: AptosAccount, receiverAddress: HexString): Promise<string> {
    const rawTxn = await this.generateTransaction(minter.address(), {
      function: `${minter.address()}::appcolla::get`,
      type_arguments: [],
      arguments: [TxnBuilderTypes.AccountAddress.fromHex(receiverAddress)],
    });

    const bcsTxn = await this.signTransaction(minter, rawTxn);
    const pendingTxn = await this.submitTransaction(bcsTxn);
    console.log(pendingTxn);

    return pendingTxn.hash;
  }

  /** Return the balance of the newly created coin */
  async getResourceMsg(accountAddress: MaybeHexString, coinTypeAddress: HexString): Promise<string | number> {
    try {
      const resource = await this.getAccountResource(
        accountAddress,
        `${coinTypeAddress.hex()}::appcolla::CollInfo`,
      );

      console.log(resource);

      return (resource.data as any)["msg"];
    } catch (e) {
      console.log(e);
      return 0;
    }
  }

  /** Return the balance of the newly created coin */
  async getBalance(accountAddress: MaybeHexString, coinTypeAddress: HexString): Promise<string | number> {
    try {
      const resource = await this.getAccountResource(
        accountAddress,
        `0x1::coin::CoinStore<${coinTypeAddress.hex()}::moon_coin::MoonCoin>`,
      );

      return parseInt((resource.data as any)["coin"]["value"]);
    } catch (_) {
      return 0;
    }
  }
}

export const privateKey = '0xbc20b78cf1a1c79c1e9c50a8771d2184ede92d659672f3e89ac899165ebf471f';


/** run our demo! */
async function main() {
  // assert(process.argv.length == 3, "Expecting an argument that points to the moon_coin directory.");

  const client = new CollectionClient();
  const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

  // Create two accounts, Alice and Bob, and fund Alice but not Bob

  const alice = new AptosAccount(new HexString(privateKey).toUint8Array());
  const bob = new AptosAccount();

  console.log("\n=== Addresses ===");
  console.log(`Alice: ${alice.address()}`);
  console.log(`Bob: ${bob.address()}`);

  // await faucetClient.fundAccount(alice.address(), 100_000_000);
  // await faucetClient.fundAccount(bob.address(), 100_000_000);

  // await new Promise<void>((resolve) => {
  //   readline.question("Update the module with Alice's address, compile, and press enter.", () => {
  //     resolve();
  //     readline.close();
  //   });
  // });

  // :!:>publish
  // console.log('readFileSync........');
  // const modulePath = process.argv[2];
  // const packageMetadata = fs.readFileSync(path.join(modulePath, "build", "collection", "package-metadata.bcs"));
  // const moduleData = fs.readFileSync(path.join(modulePath, "build", "collection", "bytecode_modules", "appcolla.mv"));

  // console.log("Publishing Collection package.");
  // let txnHash = await client.publishPackage(alice, new HexString(packageMetadata.toString("hex")).toUint8Array(), [
  //   new TxnBuilderTypes.Module(new HexString(moduleData.toString("hex")).toUint8Array()),
  // ]);
  // await client.waitForTransaction(txnHash, { checkSuccess: true }); // <:!:publish
  // console.log("publishPackage txnHash:" + txnHash);

  // console.log("Bob registers the newly created coin so he can receive it from Alice");
  // txnHash = await client.registerCoin(alice.address(), bob);
  // await client.waitForTransaction(txnHash, { checkSuccess: true });
  // console.log(`Bob's initial MoonCoin balance: ${await client.getBalance(bob.address(), alice.address())}.`);


  // let txnHash = await client.setMesage(alice, alice.address(), "apple");
  let txnHash = await client.getMesage(alice, alice.address());
  // let txnHash = await client.getResourceMsg(alice.address(), alice.address());
  console.log(txnHash);


}

if (require.main === module) {
  main().then((resp) => console.log(resp));
  exit;
}
