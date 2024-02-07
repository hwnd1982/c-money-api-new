import express from "express";
import cors from "cors";
import expressWs from "express-ws"; // Для поддержки WebSocket в Express
import {
  readData,
  writeData,
  response,
  makeAccount,
  pregenerateMineCurrencies,
  premakeAccounts,
  formatAmount,
  generateAccountId,
  pregenerateHistory,
} from "./utils.js";
import {
  AUTH_DATA,
  KNOWN_CURRENCY_CODES,
  KNOWN_OTHER_ACCOUNTS,
  MINE_ACCOUNT,
} from "./const.js";

const app = express();
expressWs(app);
const port = process.env.PORT || 3000;

let currencyFeedSubscribers = [];

const data = readData();

pregenerateMineCurrencies(data, KNOWN_CURRENCY_CODES);
premakeAccounts(data, KNOWN_OTHER_ACCOUNTS);
pregenerateHistory(data, [MINE_ACCOUNT], true);

const authCheck = (req, res, next) => {
  if (req.headers.authorization !== `Basic ${AUTH_DATA.token}`) {
    res.end(response(null, "Unauthorized"));
    return;
  }
  next();
};

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.send("Backend is working"));

app.post("/login", (req, res) => {
  const { login, password } = req.body || {};
  if (login === AUTH_DATA.login && password === AUTH_DATA.password) {
    res.type("application/json");
    res.end(response({ token: AUTH_DATA.token }));
  } else if (login === AUTH_DATA.login) {
    res.end(response(null, "Invalid password"));
  } else {
    res.end(response(null, "No such user"));
  }
});

app.get("/accounts", authCheck, (req, res) => {
  res.type("application/json");

  const myAccounts = Object.values(data.accounts)
    .filter((account) => account.mine)
    .map((account) => ({
      ...account,
      transactions: [
        account.transactions[account.transactions.length - 1],
      ].filter(Boolean),
    }));
  res.end(response(myAccounts));
});

app.get("/account/:id", authCheck, (req, res) => {
  const myAccount = data.accounts[req.params.id];
  if (myAccount) {
    res.type("application/json");
    res.end(response(myAccount));
  } else {
    res.end(response(null, "No such account"));
  }
});

app.post("/create-account", authCheck, (req, res) => {
  const newAccount = makeAccount(true);
  data.accounts[newAccount.account] = newAccount;
  writeData(data);
  res.type("application/json");
  res.end(response(newAccount));
});

app.post("/transfer-funds", authCheck, (req, res) => {
  const { from, to, amount: rawAmount } = req.body || {};
  const fromAccount = data.accounts[from];
  let toAccount = data.accounts[to];
  const amount = Number(rawAmount);

  if (!fromAccount || !fromAccount.mine || isNaN(amount) || amount < 0) {
    res.end(response(null, "Invalid request"));
    return;
  }

  if (!toAccount) {
    if (Math.random() < 0.25) {
      toAccount = makeAccount(false);
      data.accounts[to] = toAccount;
    } else {
      res.end(response(null, "Invalid account to"));
      return;
    }
  }

  if (fromAccount.balance - amount < 0) {
    res.end(response(null, "Overdraft prevented"));
    return;
  }

  fromAccount.balance -= amount;
  toAccount.balance += amount;

  const transactionTime = new Date().toISOString();
  fromAccount.transactions.push({
    date: transactionTime,
    from: fromAccount.account,
    to: toAccount.account,
    amount,
  });
  toAccount.transactions.push({
    date: transactionTime,
    from: fromAccount.account,
    to: toAccount.account,
    amount,
  });

  writeData(data);
  res.type("application/json");
  res.end(response(fromAccount));
});

app.get("/all-currencies", (req, res) => {
  res.type("application/json");
  res.end(response(KNOWN_CURRENCY_CODES));
});

app.ws("/currency-feed", (ws, req) => {
  currencyFeedSubscribers.push(ws);
  ws.on("close", () => {
    currencyFeedSubscribers = currencyFeedSubscribers.filter(
      (subscriber) => subscriber !== ws,
    );
  });
});

app.get("/currencies", authCheck, (req, res) => {
  const myCurrencies = data.mine.currencies || {};
  res.type("application/json");

  res.end(response(myCurrencies));
});

app.post("/currency-buy", authCheck, (req, res) => {
  const { from, to, amount: rawAmount } = req.body || {};
  const myCurrencies = data.mine.currencies || {};
  const amount = Number(rawAmount);

  if (
    !KNOWN_CURRENCY_CODES.includes(from) ||
    !KNOWN_CURRENCY_CODES.includes(to) ||
    isNaN(amount) ||
    amount < 0
  ) {
    res.end(response(null, "Invalid request"));
    return;
  }

  const exchangeRate = getExchangeRate(from, to) || 1;
  const fromCurrency = myCurrencies[from];
  const toCurrency = myCurrencies[to] || { amount: 0, code: to };

  if (!fromCurrency || fromCurrency.amount - amount < 0) {
    res.end(response(null, "Not enough currency"));
    return;
  }

  fromCurrency.amount -= amount;
  toCurrency.amount += amount * exchangeRate;

  myCurrencies[to] = toCurrency;

  writeData(data);
  res.type("application/json");

  res.end(response(myCurrencies));
});

app.post("*", (req, res) => res.end(response(null, "Invalid route")));

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`),
);

// Дополните функциями setExchangeRate, getExchangeRate и currencyRateFeedGenerator здесь, используя стрелочные функции...

function setExchangeRate(currency1, currency2, rate) {
  const existingInverseRate = data.exchange[`${currency2}/${currency1}`];
  if (existingInverseRate) {
    data.exchange[`${currency2}/${currency1}`] = formatAmount(1 / rate);
    return;
  }
  data.exchange[`${currency1}/${currency2}`] = rate;
}

function getExchangeRate(currency1, currency2) {
  const straightRate = Number(data.exchange[`${currency1}/${currency2}`]);
  if (!isNaN(straightRate)) {
    return straightRate;
  }
  const inverseRate = data.exchange[`${currency2}/${currency1}`];
  if (inverseRate) {
    return 1 / inverseRate;
  }
  return 0;
}

const currencyRateFeedGenerator = setInterval(() => {
  // generate currency exchange rate change
  const currenciesLength = KNOWN_CURRENCY_CODES.length;
  const index1 = Math.floor(Math.random() * currenciesLength);
  let index2 = Math.floor(Math.random() * currenciesLength);
  if (index1 === index2) {
    index2 = (index2 + 1) % currenciesLength;
  }
  const from = KNOWN_CURRENCY_CODES[index1];
  const to = KNOWN_CURRENCY_CODES[index2];
  const rate = formatAmount(0.001 + Math.random() * 100);
  const previousExchangeRate = getExchangeRate(from, to);
  const change =
    rate > previousExchangeRate ? 1 : rate < previousExchangeRate ? -1 : 0;
  setExchangeRate(from, to, rate);
  writeData(data);
  currencyFeedSubscribers.forEach((subscriber) =>
    subscriber.send(
      JSON.stringify({
        type: "EXCHANGE_RATE_CHANGE",
        from,
        to,
        rate,
        change,
      }),
    ),
  );

  // pick random user account and generate random transaction for it
  if (Math.random() > 0.9) {
    const account = data.accounts[MINE_ACCOUNT];
    const amount = formatAmount(Math.random() * 1000);
    account.balance = formatAmount(account.balance + amount);
    account.transactions.push({
      amount,
      date: new Date().toISOString(),
      from: generateAccountId(),
      to: MINE_ACCOUNT,
    });
    writeData(data);
  }
}, 1000);
currencyRateFeedGenerator.unref();
