const mongoose = require('mongoose');
const Account = require('../models/Account');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const defaultNamesForMethod = (paymentMethod = 'cash') => (
  ['cheque', 'bank_transfer', 'credit_card', 'debit_card'].includes(paymentMethod)
    ? ['Bank Account', 'Main Bank', 'BANK']
    : ['Main Cash', 'Cash', 'CASH']
);

async function findActiveAccountById(accountId, session = null) {
  if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) return null;
  return Account.findOne({ _id: accountId, isActive: true }).session(session);
}

async function findActiveAccountByNameOrCode(label, session = null) {
  if (!label || mongoose.Types.ObjectId.isValid(label)) return null;

  const exact = new RegExp(`^${escapeRegex(String(label).trim())}$`, 'i');
  return Account.findOne({
    isActive: true,
    $or: [
      { name: exact },
      { code: exact },
      { accountNumber: exact },
    ],
  }).session(session);
}

async function resolveCashAccount({ cashAccountId, cashAccount, paymentMethod }, session = null) {
  let account = await findActiveAccountById(cashAccountId, session);
  if (account) return account;

  account = await findActiveAccountById(cashAccount, session);
  if (account) return account;

  account = await findActiveAccountByNameOrCode(cashAccount, session);
  if (account) return account;

  for (const fallback of defaultNamesForMethod(paymentMethod)) {
    account = await findActiveAccountByNameOrCode(fallback, session);
    if (account) return account;
  }

  throw new Error('Cash/bank account not found');
}

module.exports = {
  resolveCashAccount,
};
