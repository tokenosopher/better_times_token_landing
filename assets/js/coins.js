let providerInstalled = true;
let metamaskInstalled = true;
let metamaskUnlocked = true;
let validChainPoly = false;
let userAccount;

let betterTimesToken;

//polygon chain variables (to add mainnet once contract is deployed and connection made):

let validChainIDPoly = option_is_mainnet ? "0x89" : "0x13881"
let BetterTimesTokenAddressPoly = option_is_mainnet ? "0x01A8d35b2fd85dd2e73760d4E6300F1bdD47A118" :
    "0x2eab25333FB01eAce6378DDbcA5B3423458d05C8"

//function to check user account and retrieve either via Infura or via the chain.
async function retrieveUserAccount() {
    let accounts = await ethereum.request({method: 'eth_accounts'})
    if (accounts.length === 0) {
        //if provider is Metamask and it's a valid chain but ethereum is locked:
        metamaskUnlocked = false;
    } else {
        metamaskUnlocked = true;
        //if provider is Metamask and it's a valid chain and accounts are retrievable:
        userAccount = accounts[0];
    }
}

window.addEventListener('load', async () => {
    const provider = await detectEthereumProvider();
    if (provider) {
        if (provider !== window.ethereum) {
            //if provider is not metamask:
            console.error("Multiple wallets installed")
            providerInstalled = false;
        } else {
            //if provider is metamask:
            window.web3 = new Web3(ethereum);
            const chainId = await ethereum.request({method: 'eth_chainId'});
            if (chainId === validChainIDPoly) {
                betterTimesToken = new web3.eth.Contract(betterTimesTokenABI, BetterTimesTokenAddressPoly)
                retrieveUserAccount()
                validChainPoly = true;
            } else {
                //if provider is metamask but the blockchain is different from the valid chain:
                console.log("invalid chain id")
                console.log(chainId)
            }
        }

    } else {
        //if provider is not Ethereum:
        console.log("Non-Ethereum browser detected. You should consider installing MetaMask.");
        providerInstalled = false;
    }

    //handle changing the chain:
    ethereum.on('chainChanged', async () => {
        window.location.reload();
    });

    //handle changing the accounts:
    ethereum.on('accountsChanged', async () => {
        retrieveUserAccount()
    });
})

//function to handle metamask exceptions if one of the conditions is not met to run a form submission:
function handleMetamaskExceptions(blockchain="Polygon") {
    if (!providerInstalled) providerInstalledAlert()
    else if (!metamaskInstalled) $('#metamaskInstalledAlert').modal({fadeDuration: 400})

    //if blockchain is either do not try to unlock metamask, since the only time that blockchain is either is when
    // adding the token to metamask, and that doesn't require metamask to be unlocked.
    else if (!metamaskUnlocked && blockchain!=="Either") {
        $('#metamaskUnlockedAlert').modal({fadeDuration: 400})
        setTimeout(function() {ethereum.request({method: 'eth_requestAccounts'})}, 1500)
    }
    else if (blockchain==="Ethereum" && !validChainETH) $('#metamaskValidChainAlert').modal({fadeDuration: 400})
    else if (blockchain==="Polygon" && !validChainPoly) alert("Not poly!");
    else if (blockchain==="Either" && !validChainPoly && !validChainETH) alert("Not either!");
}

async function addPolygonNetwork() {
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{chainId: '0x89'}],
        });
    } catch (switchError) {
        console.log(switchError)
        let desktopErrorCode = 4902
        let mobileErrorCode = -32603
        // Check that the error is because the chain has not been added to MetaMask.
        if (switchError.code === desktopErrorCode || switchError.code === mobileErrorCode) {
            try {
                await ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [
                        {
                            chainId: "0x89",
                            rpcUrls: ["https://polygon-rpc.com"],

                            chainName: "Polygon Mainnet",
                            nativeCurrency: {
                                name: "MATIC",
                                symbol: "MATIC", // 2-6 characters long
                                decimals: 18,
                            },
                            blockExplorerUrls: ["https://polygonscan.com/"],
                        },
                    ],
                });
                //reload page after, in case it doesn't load itself.
                window.location.reload();
            } catch (addError) {
                // handle "add" error
            }
        }
        else if (switchError.message === "ethereum is not defined") {
            providerInstalledAlert()

        }
    }
}

//function to check if all conditions are met to run a form submission:
function checkMetamaskExceptions(blockchain="Polygon") {
    if (blockchain==="Polygon") {
        return (providerInstalled && metamaskInstalled && metamaskUnlocked && validChainPoly)
    }
    //conditions that do not check if the metamask wallet has been unlocked, since adding the token to the wallet
    //does not require it
    else if (blockchain==="Polygon-no-unlock") {
        return (providerInstalled && metamaskInstalled && validChainPoly)
    }
    }

function providerInstalledAlert() {
    if ($(window).width() < 409) {
        $("#providerInstalledCloseBtn").css("float", "inherit")
        $("#providerInstalledGetMetamaskBtn").css("float", "inherit")
    }

    $('#providerInstalledAlert').modal({
        fadeDuration: 400
    })
}

function buttonToPleaseWait(thisid) {
    thisid = "#" + thisid
    $(thisid).find('.submitBtnForm').attr("disabled", true)
    $(thisid).find('.submitBtnFormText').text("Please wait...")
    $(thisid).find('.submitBtnFormIcon').hide()
}

function pleaseWaitToButton(thisid) {
    thisid = "#" + thisid
    $(thisid).find('.submitBtnForm').attr("disabled", false)
    $(thisid).find('.submitBtnFormText').text("Get GRTFUL")
    $(thisid).find('.submitBtnFormIcon').show()
}

function toWei(amount) {
    return web3.utils.toWei(amount)
}

$("#form-deed").submit(async function (e) {
    e.preventDefault();
    if (checkMetamaskExceptions()) {
        let messageType = $("#message-type").val();
        let amount = $("#UPNUP-amount").val();
        let myDeed = $("#UPNUP-my-deed").val();
        let timespan = $("#timespan-deed").val();

        if (messageType === "" || amount === "" || myDeed === "" || timespan === "pleaseSelect") {
            $('#fieldsNotFilled').modal({
                fadeDuration: 400
            })
        } else {
            //disabling the submit button while the transaction is running:
            buttonToPleaseWait(this.id)
            if(messageType==="myDeed") {
                try {
                    let submit = await betterTimesToken.methods.stakeOne(toWei(amount), myDeed, timespan).send({from:userAccount})
                    console.log(submit)
                    $('#transactionSuccess').modal({
                        fadeDuration: 400
                    })
                } catch (e) {
                    $('#transactionFailedMsg').text(e.message)
                    $('#transactionFailed').modal({
                        fadeDuration: 400
                    })
            }


            }
            pleaseWaitToButton(this.id)
        }
    } else handleMetamaskExceptions()
})

$("#form-story").submit(async function (e) {
    e.preventDefault();
    if (checkMetamaskExceptions()) {
        let messageType = $("#message-type").val();
        let amount = $("#UPNUP-amount-story").val();
        let name = $("#fname").val();
        let myStory = $("#myStory").val();
        let timespan = $("#timespan-story").val();

        if (messageType === "" || amount === "" || name === "" || timespan === "pleaseSelect" || myStory === "") {
            $('#fieldsNotFilled').modal({
                fadeDuration: 400
            })
        } else {
            //disabling the submit button while the transaction is running:
            buttonToPleaseWait(this.id)
            if(messageType==="myStory") {
                try {
                    let submit = await betterTimesToken.methods.stakeTwo(toWei(amount), name, myStory, timespan).send({from:userAccount})
                    console.log(submit)
                    $('#transactionSuccess').modal({
                        fadeDuration: 400
                    })
                } catch (e) {
                    $('#transactionFailedMsg').text(e.message)
                    $('#transactionFailed').modal({
                        fadeDuration: 400
                    })
                }


            }
            pleaseWaitToButton(this.id)
        }
    } else handleMetamaskExceptions()
})



//function that adds the token to the metamask wallet via a button:
async function addTokenToAddress() {
    const tokenSymbol = 'UPNUP';
    const tokenDecimals = 18;
    // const tokenImage = 'https://sacredcoinprotocol.com/assets/images/coin_icons/gratitude_coin.png';

    //if the valid chain is polygon:
    if (checkMetamaskExceptions("Polygon-no-unlock")) {
        try {
            // wasAdded is a boolean. Like any RPC method, an error may be thrown.
            const wasAdded = await ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20', // Initially only supports ERC20, but eventually more!
                    options: {
                        address: BetterTimesTokenAddressPoly, // The address that the token is at.
                        symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 chars.
                        decimals: tokenDecimals, // The number of decimals in the token
                        // image: tokenImage, // A string url of the token logo
                    },
                },
            });
            if (wasAdded) {
                $('#successfullyAddedCoinToMetamask').modal({
                    fadeDuration: 400
                })
            } else {
                console.log('Your loss!');
            }
        } catch (error) {
            console.log(error);
        }
    } else handleMetamaskExceptions("Either");
}


//function to reveal dropdown menu
$("#message-type").change(function () {
    var end = this.value;
    console.log(end)
    if (end==="myDeed") {
        $("#form-story").attr('hidden', true)
        $("#form-deed").attr('hidden', false)
    }

    if (end==="myStory") {
        $("#form-story").attr('hidden', false)
        $("#form-deed").attr('hidden', true)
    }

    if (end==="pleaseSelect") {
        $("#form-story").attr('hidden', true)
        $("#form-deed").attr('hidden', true)
    }

});

async function unstakeUPNUP() {
    hasStake = await betterTimesToken.methods.hasStake(userAccount).call({from:userAccount})
    console.log(hasStake)
    let unlockDate = new Date(hasStake.StakingUnlockInSeconds * 1000);
    if (Date.now() < unlockDate) {
        alert(`You still have to wait until ${unlockDate.toString()}`)
    }
    else {
        try {
                await betterTimesToken.methods.withdrawStake().send({from:userAccount})
            } catch (e) {
                console.log(e.message)
            }
    }
}


async function checkDeadlines() {
    hasStake = await betterTimesToken.methods.hasStake(userAccount).call({from:userAccount})
    console.log(hasStake)
    if(hasStake.isStaking=false){
        $('#nothingStaked').modal({fadeDuration: 400})
    }
    else {
        let unstakingDate = new Date(hasStake.StakingUnlockInSeconds * 1000);
        let deadlineForStaking = new Date(hasStake.StakingDeadlineInSeconds * 1000);
        $("#start-unstaking").append(unstakingDate.toString())
        $("#staking-deadline").append(deadlineForStaking.toString())
        $('#stakeResult').modal({fadeDuration: 400})
    }

}



//start-unstaking
//staking-deadline
