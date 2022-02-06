let providerInstalled = true;
let metamaskInstalled = true;
let metamaskUnlocked = true;
let validChainETH = true;
let validChainPoly = false;

let gratitudeCoinCrowdsale;
let gratitudeCoin;
let userAccount;


//variables set based on whether or not the provider is mainnet or testnet:
let validChainIDEth = option_is_mainnet ? "0x1" : "0x4"
let gratitudeCoinAddress = option_is_mainnet ? "0x6563b5D8925ad3684BDB5923d56B0B24044eB90F" :
    "0x0696A7F92E5e26Be9f38158F599c2238729C6D15"
let gratitudeCoinCrowdsaleAddress = option_is_mainnet ? "0x7405E58Eb83D274047Ce65b28Fd84b6365759Bf0" :
    "0x9fBc3A7cC6219cf7fd27c332977817a6717B11BB"
let providerAddress = option_is_mainnet ? "https://mainnet.infura.io/v3/69dac97dc2184662abd22ea16454723f" :
    "https://rinkeby.infura.io/v3/69dac97dc2184662abd22ea16454723f"

//polygon chain variables (to add mainnet once contract is deployed and connection made):

let validChainIDPoly = option_is_mainnet ? "0x89" : "0x13881"
let gratitudeCoinAddressPoly = option_is_mainnet ? "0x01A8d35b2fd85dd2e73760d4E6300F1bdD47A118" :
    "0x453De72B9FfDB66fCb238E58b95c30C577e7298F"

//Retrieving guidelines from code via Infura:
async function retrieveGuidelinesViaInfura() {
    window.web3 = new Web3(new Web3.providers.HttpProvider(providerAddress))
    try {
        gratitudeCoin = new web3.eth.Contract(gratitudeCoinABI, gratitudeCoinAddress)
        populateGuidelines()

    } catch (e) {
        console.log(e.message);
    }
}

//function to check user account and retrieve either via Infura or via the chain.
async function retrieveUserAccount(initialRun) {
    // let accounts = initialRun ? await ethereum.request({method: 'eth_accounts'}) :
    //     await ethereum.request({method: 'eth_requestAccounts'})
    let accounts = await ethereum.request({method: 'eth_accounts'})
    if (accounts.length === 0) {
        //if provider is Metamask and it's a valid chain but ethereum is locked:
        metamaskUnlocked = false;
        console.log("Ethereum is locked - retrieving guideline via Infura")
        if (initialRun) retrieveGuidelinesViaInfura()
    } else {
        metamaskUnlocked = true;
        //if provider is Metamask and it's a valid chain and accounts are retrievable:
        userAccount = accounts[0];
        if (initialRun) populateGuidelines()
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
            if (chainId === validChainIDEth) {
                //if provider is metamask and it's the Ethereum Chain:
                gratitudeCoinCrowdsale = new web3.eth.Contract(gratitudeCoinCrowdsaleABI, gratitudeCoinCrowdsaleAddress);
                gratitudeCoin = new web3.eth.Contract(gratitudeCoinABI, gratitudeCoinAddress)
                retrieveUserAccount(initialRun = true)
            } else if (chainId === validChainIDPoly) {
                gratitudeCoin = new web3.eth.Contract(gratitudeCoinPolyABI, gratitudeCoinAddressPoly)
                retrieveUserAccount(initialRun = true)
                validChainETH = false;
                validChainPoly = true;
            } else {
                //if provider is metamask but the blockchain is different from the valid chain:
                validChainETH = false;
                console.log("invalid chain id")
                console.log(chainId)
                retrieveGuidelinesViaInfura()
            }
        }

    } else {
        //if provider is not Ethereum:
        console.log("Non-Ethereum browser detected. You should consider installing MetaMask.");
        providerInstalled = false;
        retrieveGuidelinesViaInfura()
    }

    //handle changing the chain:
    ethereum.on('chainChanged', async () => {
        window.location.reload();
    });

    //handle changing the accounts:
    ethereum.on('accountsChanged', async () => {
        retrieveUserAccount(initialRun = false)
    });
})

//function to handle metamask exceptions if one of the conditions is not met to run a form submission:
function handleMetamaskExceptions(blockchain="Ethereum") {
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
        else if (switchError.message == "ethereum is not defined") {
            providerInstalledAlert()

        }
    }
}

//function to check if all conditions are met to run a form submission:
function checkMetamaskExceptions(blockchain="Ethereum") {
    if (blockchain==="Ethereum") {
        return (providerInstalled && metamaskInstalled && metamaskUnlocked && validChainETH)
    }
    else if (blockchain==="Polygon") {
        return (providerInstalled && metamaskInstalled && metamaskUnlocked && validChainPoly)
    }


    //conditions that do not check if the metamask wallet has been unlocked, since adding the token to the wallet
    //does not require it
    else if (blockchain==="Polygon-no-unlock") {
        return (providerInstalled && metamaskInstalled && validChainPoly)
    }

    else if (blockchain==="Ethereum-no-unlock") {
        return (providerInstalled && metamaskInstalled && validChainETH)
    }
}

async function populateGuidelines() {
    // Start here
    let guidelines = await gratitudeCoin.methods.returnAllGuidelines().call();
    console.log(guidelines[0].summary)
    for (i = 0; i <= guidelines.length; i++) {
        $("#test-summary").append($("<h4></h4>").text(guidelines[i].summary))
            .append($("</br>"))
            .append($("<p></p>").text(guidelines[i].guideline))
            .append($("</br>"));
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

$("#gratitude-form-personalized").submit(async function (e) {
    e.preventDefault();
    if (checkMetamaskExceptions()) {
        let amount = $("#GRTFUL-amount").val();
        let name = $("#fname").val();
        let gratitudeEvent = $("#fgratitudeobject").val();

        if (name === "" || gratitudeEvent === "" || amount === "") {
            $('#fieldsNotFilled').modal({
                fadeDuration: 400
            })
        } else {
            //disabling the submit button while the transaction is running:
            buttonToPleaseWait(this.id)
            try {
                let submit = await gratitudeCoinCrowdsale.methods.buyTokensPersonalized(userAccount, name, gratitudeEvent)
                    .send({from: userAccount, value: amount * 10000000000000000})
                $('#transactionSuccess').modal({
                    fadeDuration: 400
                })
            } catch (e) {
                $('#transactionFailedMsg').text(e.message)
                $('#transactionFailed').modal({
                    fadeDuration: 400
                })

            }
            pleaseWaitToButton(this.id)
            $("#GRTFUL-amount").val("");
            $("#fname").val("");
            $("#fgratitudeobject").val("")
        }
    } else handleMetamaskExceptions()
})


$("#gratitude-form-generic").submit(async function (e) {
    e.preventDefault();
    if (checkMetamaskExceptions()) {
        let amount = $("#GRTFUL-amount-generic").val();

        if (amount === "" || amount < 1) {
            alert("You need to input the amount, and it needs to be more than 1")
        } else {
            //disabling the submit button while the transaction is running:
            buttonToPleaseWait(this.id)
            try{
            let submit = await gratitudeCoinCrowdsale.methods.buyTokens(userAccount)
                .send({from: userAccount, value: amount * 10000000000000000})
            $('#transactionSuccess').modal({
                fadeDuration: 400
            })
            console.log(submit)
            } catch (e) {
                $('#transactionFailedMsg').text(e.message)
                $('#transactionFailed').modal({
                    fadeDuration: 400
                })
            }
            //re-enabling the submit button.
            pleaseWaitToButton(this.id)
            $("#GRTFUL-amount-generic").val("");
        }
    } else handleMetamaskExceptions()
})

//function that adds the token to the metamask wallet via a button:
async function addTokenToAddress() {
    const tokenSymbol = 'GRTFUL';
    const tokenDecimals = 18;
    const tokenImage = 'https://sacredcoinprotocol.com/assets/images/coin_icons/gratitude_coin.png';

    //if the valid chain is ethereum:
    if (checkMetamaskExceptions("Ethereum-no-unlock")) {
        try {
            // wasAdded is a boolean. Like any RPC method, an error may be thrown.
            const wasAdded = await ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20', // Initially only supports ERC20, but eventually more!
                    options: {
                        address: gratitudeCoinAddress, // The address that the token is at.
                        symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 chars.
                        decimals: tokenDecimals, // The number of decimals in the token
                        image: tokenImage, // A string url of the token logo
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
        //if the valid chain is polygon:
    } else if (checkMetamaskExceptions("Polygon-no-unlock")) {
        try {
            // wasAdded is a boolean. Like any RPC method, an error may be thrown.
            const wasAdded = await ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20', // Initially only supports ERC20, but eventually more!
                    options: {
                        address: gratitudeCoinAddressPoly, // The address that the token is at.
                        symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 chars.
                        decimals: tokenDecimals, // The number of decimals in the token
                        image: tokenImage, // A string url of the token logo
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

$("#gratitude-share-form-personalized").submit(async function (e) {
    e.preventDefault()
    if (checkMetamaskExceptions()) {
        let recipientAddress = $("#GRTFUL-share-address").val()
        let amount = $("#GRTFUL-share-amount").val();
        let name = $("#fsharename").val();
        let gratitudeEvent = $("#fsharegratitudeobject").val();
        if (recipientAddress === "" || name === "" || gratitudeEvent === "" || amount === "") {
            $('#fieldsNotFilledShare').modal({
                fadeDuration: 400
            })
        }
        //check if the address inputted in the form is valid:
        else if (!web3.utils.isAddress(recipientAddress)) {
            $('#notValidAddressShare').modal({
                fadeDuration: 400
            })
        } else {
            let funds = await gratitudeCoin.methods.balanceOf(userAccount).call()
            funds = web3.utils.fromWei(funds, "ether")
            let amountInt = parseInt(amount)
            funds = parseInt(funds)
            if (funds < amountInt) {
                $('#notEnoughFundsShare').modal({
                    fadeDuration: 400
                })
            } else {

                //converting the amount given to wei:
                let amountWei = web3.utils.toWei(amount, "ether").toString()

                console.log(amountWei, recipientAddress)

                //disabling the buy button while waiting for the transaction to finish.
                buttonToPleaseWait(this.id)
                try{
                    //calling the function to submit the amount:
                    let submit = await gratitudeCoin.methods.transferGrateful(recipientAddress, amountWei, name, gratitudeEvent)
                        .send({from: userAccount})
                    $('#transactionSuccessShared').modal({
                        fadeDuration: 400
                    })
                } catch (e) {
                    $('#transactionFailedMsg').text(e.message)
                    $('#transactionFailed').modal({
                        fadeDuration: 400
                    })
                }
                //re-enabling the button:
                pleaseWaitToButton(this.id)

                //clearing the values of the form:
                $("#GRTFUL-share-address").val("")
                $("#GRTFUL-share-amount").val("");
                $("#fsharename").val("");
                $("#fsharegratitudeobject").val("");
            }
        }
    } else handleMetamaskExceptions()
})

$("#gratitude-share-form-personalized-poly").submit(async function (e) {
    e.preventDefault()
    if (checkMetamaskExceptions("Polygon")) {
        let recipientAddress = $("#GRTFUL-share-address-poly").val()
        let amount = $("#GRTFUL-share-amount-poly").val();
        let name = $("#fsharenamepoly").val();
        let gratitudeEvent = $("#fsharegratitudeobjectpoly").val();
        if (recipientAddress === "" || name === "" || gratitudeEvent === "" || amount === "") {
            $('#fieldsNotFilledShare').modal({
                fadeDuration: 400
            })
        }
        //check if the address inputted in the form is valid:
        else if (!web3.utils.isAddress(recipientAddress)) {
            $('#notValidAddressShare').modal({
                fadeDuration: 400
            })
        } else {
            let funds = await gratitudeCoin.methods.balanceOf(userAccount).call()
            funds = web3.utils.fromWei(funds, "ether")
            let amountInt = parseInt(amount)
            funds = parseInt(funds)
            if (funds < amountInt) {
                $('#notEnoughFundsShare').modal({
                    fadeDuration: 400
                })
            } else {

                //converting the amount given to wei:
                let amountWei = web3.utils.toWei(amount, "ether").toString()

                console.log(amountWei, recipientAddress)

                //disabling the buy button while waiting for the transaction to finish.
                buttonToPleaseWait(this.id)
                try{
                    //calling the function to submit the amount:
                    let submit = await gratitudeCoin.methods.transferGrateful(recipientAddress, amountWei, name, gratitudeEvent)
                        .send({from: userAccount})
                    $('#transactionSuccessSharedPoly').modal({
                        fadeDuration: 400
                    })
                } catch (e) {
                    $('#transactionFailedMsg').text(e.message)
                    $('#transactionFailed').modal({
                        fadeDuration: 400
                    })
                }
                //re-enabling the button:
                pleaseWaitToButton(this.id)

                //clearing the values of the form:
                $("#GRTFUL-share-address-poly").val("")
                $("#GRTFUL-share-amount-poly").val("");
                $("#fsharenamepoly").val("");
                $("#fsharegratitudeobjectpoly").val("");
            }
        }
    } else handleMetamaskExceptions("Polygon")
})


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
//Making the metamask button dynamic based on window size:
// $(window).on('resize', function () {
//     let windowWidth = $(window).width()
//     if (windowWidth < 412) {
//         console.log(true)
//         $(".button-border-metamask").css("padding", "0 4.5rem 60px")
//     } else if (500 < windowWidth && windowWidth < 550) {
//         $(".button-border-metamask").css("padding", "0 4.5rem 80px")
//     } else {
//         $(".button-border-metamask").css("padding", "0 4.5rem 0px")
//     }
// })