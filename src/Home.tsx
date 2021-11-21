import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar, makeStyles, Typography } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";
import { fontFamily } from "@mui/system";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; 

const MintContainer = styled.div``;

const MintButton = styled(Button)``; 

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);
  
  const classes = useStyles()

  return (
    <main className={classes.cover}>
      {wallet && (
        <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
      )}

      {wallet && <p>Balance: {(balance || 0).toLocaleString()} SOL</p>}

      {wallet && <p>Total Available: {itemsAvailable}</p>}

      {wallet && <p>Redeemed: {itemsRedeemed}</p>}

      {wallet && <p>Remaining: {itemsRemaining}</p>}

      <div className={classes.mintArea}>
        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <br></br>

        <div className={classes.words}>
          <h1>YIN YANG NFT SERVICE</h1>
          <h2>Membership Pass</h2>
          <br></br>
          <h3>Custom premium services</h3>
          <h3>Top DAO's alpha from insider network</h3>
          <h3>Guaranteed whitelists spots for upcoming hyped drops</h3>
          <br></br>
        </div>
      <MintContainer>
        {!wallet ? (
          <ConnectButton className={classes.centerConnect}>Connect Wallet</ConnectButton>
        ) : (
          <>
          <Typography className = {classes.price}>      
            Price: 0.33 SOL
          </Typography>

          <MintButton
            className={classes.mint}
            disabled={isSoldOut || isMinting || !isActive}
            onClick={onMint}
            variant="contained"
          >
            
            {isSoldOut ? (
              "SOLD OUT"
            ) : isActive ? (
              isMinting ? (
                <CircularProgress />
              ) : (
                "MINT"
              )
            ) : (
              <Countdown
                date={startDate}
                onMount={({ completed }) => completed && setIsActive(true)}
                onComplete={() => setIsActive(true)}
                renderer={renderCounter}
              />
            )}
          </MintButton>
          </>
        )}
      </MintContainer>
      </div>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

const useStyles = makeStyles(theme => ({
  words: {
    color: '#000',
    textAlign: 'center',
    fontSize: 20,
  },
  mint: {
    background: '#FFF',
    color: 'black',
    border: 3,
    borderRadius: 3,
    height: 70,
    width: 150,
    fontSize: 22,
    font: 'Helvetica',
    padding: '30px 30px',

    '&:disabled':{
      backgroundColor:'#11C8C5',
      color:'white',
      opacity:'0.5'
    },
    '&:hover': {
      backgroundColor: '#EC683E',
      boxShadow: '0 0 50px white',
      color: 'black'
    }
  },
  bar: {
    position: 'absolute',
    top: '80%'
  },
  soldOut: {
    color: 'whitesmoke'
  },
  cover: {
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    width: '100%',
    height: '100%',
    position: 'absolute',
    margin: '0 auto',
    background: '#FFFFF3',
    fontFamily: 'copperplate'
  },
  progressBarClass: {
    transform:'translate(0%, 150%)',
    height:'10px',
    width:'500px',
    borderRadius:'50px',
    backgroundColor:'black'
  },
  centerConnect: {
    background: '#000',
    color: 'white',
    border: 0,
    borderRadius: 3,
    height: 100,
    width: 250,
    fontSize: 22,
    font: 'Monaco',
    padding: '30px 30px',

    '&:disabled':{
      backgroundColor:'#11C8C5',
      color:'white',
      opacity:'0.5'
    },
    '&:hover': {
      backgroundColor: '#76D4AA',
      boxShadow: '0 0 50px white',
      color: 'black'
    }
  },
  mintArea: {
    color: 'white',
    position: 'absolute', left: '50%', top: '20%',
    transform: 'translate(-50%, -50%)',
    fontSize: '60px',
    textAlign: 'center',
  },
  price: {
    fontSize: '25px',
    marginTop:'20px',
    fontFamily:'Courier New',
    justifyContent: "center",
    color: '#000',
    fontWeight: 'bold'
  },
  price1:{
    fontSize: '50px',
    color:'white',
    // display: "flex",
    position:'absolute',
    margin:'0 auto',
    top:'50%',
    left:'50%',
    transform:'translate(-50%,-400%)',
    fontFamily:'Lato',
    alignSelf:'center',
  
  },
  howManyRemaining:{
    fontSize:'25px',
    fontFamily:'Lato'
  },
  homeButton: {
    borderRadius: 3,
    background: 'linear-gradient(to right, #E7E9BB, #403B4A)',
    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
    color: 'white',
    height: 45,
    width: 150,
    padding: '5px 5px',
    position: 'absolute', left: '10%', top: '10%',
    transform: 'translate(-50%, -50%)',
  }
}));

export default Home;
