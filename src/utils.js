import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MINE_ACCOUNT } from "./const.js";

// Получаем путь к текущему файлу и определяем директорию для публичных файлов
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "../public");

const readData = () => {
  return JSON.parse(
    fs.readFileSync(path.join(PUBLIC_DIR, "/data.json"), "utf8"),
  );
};

const writeData = (dataToWrite) => {
  fs.writeFileSync(
    `${PUBLIC_DIR}/data.json`,
    JSON.stringify(dataToWrite, null, 4),
  );
};

const response = (payload = null, error = "") => {
  return JSON.stringify({ payload, error });
};

const formatAmount = (number) => {
  return Number(number.toFixed(2));
};

const generateAccountId = () => {
  return Array.from({ length: 26 }, () => Math.floor(Math.random() * 10)).join(
    "",
  );
};

const makeAccount = (mine = false, preseededId = "") => {
  return {
    account: preseededId || generateAccountId(),
    date: new Date().toISOString(),
    mine,
    balance: 0,
    transactions: [],
  };
};

const pregenerateMineCurrencies = (data, knownCurrencies) => {
  const currencies = data.mine.currencies;
  knownCurrencies.forEach((currency) => {
    if (!currencies[currency]) {
      currencies[currency] = {
        amount: Math.random() * 100,
        code: currency,
      };
    }
  });
  writeData(data);
};

const premakeAccounts = (data, newAccounts, mine = false) => {
  const accounts = data.accounts;
  newAccounts.forEach((account) => {
    if (!accounts[account]) {
      accounts[account] = makeAccount(mine, account);
    }
  });
  writeData(data);
};

const pregenerateHistory = (data, accounts, mine = false) => {
  premakeAccounts(data, accounts, mine);
  const months = 10;
  const transactionsPerMonth = 5;
  accounts.forEach((accountId) => {
    const account = data.accounts[accountId];
    if (account.transactions.length >= months * transactionsPerMonth) {
      return;
    }

    const dayAsMs = 24 * 60 * 60 * 1000;
    const monthAsMs = 30 * dayAsMs;
    const yearAsMs = 12 * monthAsMs;
    let date = Date.now() - yearAsMs;

    if (account.account === MINE_ACCOUNT) {
      account.date = new Date(date).toISOString();
    }
    for (let month = 0; month <= months; month++) {
      for (
        let transaction = 0;
        transaction <= transactionsPerMonth;
        transaction++
      ) {
        const sign = Math.random() < 0.5 ? 1 : -1;
        const amount = formatAmount(Math.random() * 10000);

        const otherAccountId = generateAccountId();
        const randomDaysOffset =
          (Math.random() - 0.5) * Math.random() * 5 * dayAsMs;

        account.transactions.push({
          date: new Date(date + randomDaysOffset).toISOString(),
          from: sign < 0 ? accountId : otherAccountId,
          to: sign > 0 ? accountId : otherAccountId,
          amount,
        });
      }
      date += monthAsMs;
    }
  });
};

export {
  readData,
  writeData,
  response,
  makeAccount,
  pregenerateMineCurrencies,
  premakeAccounts,
  formatAmount,
  generateAccountId,
  pregenerateHistory,
};
