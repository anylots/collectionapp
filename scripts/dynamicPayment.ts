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

export const alicePrivateKey = '0xbc20b78cf1a1c79c1e9c50a8771d2184ede92d659672f3e89ac899165ebf471f';
export const bobPrivateKey = '0xf06be417ba04e8f940bd75106c8276c46f26ec92e077702da597e3f475454bad';

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
  async set_payment_address(signer: AptosAccount, funcAddress: HexString, payment_address: HexString): Promise<string> {
    const rawTxn = await this.generateTransaction(signer.address(), {
      function: `${funcAddress}::paymentChannel::set_payment_address`,
      type_arguments: [],
      arguments: ["testPay", payment_address],
    });

    const bcsTxn = await this.signTransaction(signer, rawTxn);
    const pendingTxn = await this.submitTransaction(bcsTxn);
    console.log(pendingTxn);
    return pendingTxn.hash;
  }

  async payment(signer: AptosAccount, funcAddress: HexString, paymentChannel: HexString, amount: number): Promise<string> {
    const rawTxn = await this.generateTransaction(signer.address(), {
      function: `${funcAddress}::paymentChannel::payment`,
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
      arguments: [paymentChannel, amount],
    });

    const bcsTxn = await this.signTransaction(signer, rawTxn);
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

  async publishModule(modulePath: string, singer: AptosAccount) {

    const packageMetadata = fs.readFileSync(path.join(modulePath, "build", "dynamicPayment", "package-metadata.bcs"));
    const moduleData = fs.readFileSync(path.join(modulePath, "build", "dynamicPayment", "bytecode_modules", "paymentChannel.mv"));

    console.log("Publishing dynamicPayment package.");
    let txnHash = await this.publishPackage(singer, new HexString(packageMetadata.toString("hex")).toUint8Array(), [
      new TxnBuilderTypes.Module(new HexString(moduleData.toString("hex")).toUint8Array()),
    ]);
    await this.waitForTransaction(txnHash, { checkSuccess: true }); // <:!:publish
    console.log("publishPackage txnHash:" + txnHash);
    return txnHash;
  }
}

/** run our demo! */
async function main() {
  // assert(process.argv.length == 3, "Expecting an argument that points to the moon_coin directory.");

  const collectionClient = new CollectionClient();
  const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

  // Create two accounts, Alice and Bob, and fund Alice but not Bob
  const alice = new AptosAccount(new HexString(alicePrivateKey).toUint8Array());
  const bob = new AptosAccount(new HexString(bobPrivateKey).toUint8Array());

  console.log("\n=== Addresses ===");
  console.log(`Alice: ${alice.address()}`);
  console.log(`Bob: ${bob.address()}`);

  // await faucetClient.fundAccount(alice.address(), 100_000_000);
  // await faucetClient.fundAccount(bob.address(), 100_000_000);

  // publish
  console.log('readFileSync........');
  const modulePath = process.argv[2];
  // let txnHash = await collectionClient.publishModule(modulePath, alice);

  // let txnHash = await collectionClient.set_payment_address(alice, alice.address(), bob.address());

  //0x5758138fa408e00258b2d86a03799ffdcc6d48830055a767476619b6305d45b5
  let paymaster_privateKey="0x052dd422fcb296079130220c7b7909fdef38c7dfeea914df5d94dddfc3cae04e";
  const paymaster = new AptosAccount(new HexString(paymaster_privateKey).toUint8Array());

  let txnHash = await collectionClient.payment(paymaster, alice.address(), alice.address(), 10000);

  // let txnHash = await collectionClient.getMesage(alice, alice.address());
  // let txnHash = await collectionClient.getResourceMsg(bob.address(), alice.address());
  console.log(txnHash);
}

if (require.main === module) {
  main().then((resp) => console.log(resp));
  exit;
}
