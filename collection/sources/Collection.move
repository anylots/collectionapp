module Collection::appcolla {
use std::string;
use std::signer;
use std::error;

struct CollInfo has key { msg: string::String }

/// There is no message present
const ENO_MESSAGE: u64 = 0;

public fun get(addr: address):string::String acquires CollInfo{
    assert!(exists<CollInfo>(addr), error::not_found(ENO_MESSAGE));
    *&borrow_global<CollInfo>(addr).msg
}

public entry fun write(account: signer, msg: string::String)acquires CollInfo{
    let account_addr = signer::address_of(&account);
    if (!exists<CollInfo>(account_addr)) {
        move_to(&account, CollInfo {
        msg:msg,
       });
    }else{
        let account_res = borrow_global_mut<CollInfo>(account_addr); 
        account_res.msg = msg;
    }
  }
}