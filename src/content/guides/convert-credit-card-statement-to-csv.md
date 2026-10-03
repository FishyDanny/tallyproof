---
title: "How to convert a credit card statement PDF to CSV"
description: "Credit card statements have no running balance and reversed signs. How to convert one to CSV, check it with the statement totals, and import it correctly."
slug: convert-credit-card-statement-to-csv
---

Converting a credit card statement looks like the same job as converting a bank statement, but two things make it harder. Most card statements don't print a balance after each transaction, so there is less to check the conversion against. And the numbers run the other way: the balance is money you owe, so a purchase makes it go up and a payment makes it go down.

This guide explains how to deal with both, so the CSV you end up with is complete and imports with every amount pointing the right way.

## How a credit card statement is laid out

Layouts vary between card issuers, but most statements have two parts.

- **A summary box**, usually on the first page, with the opening (or previous) balance, the total of payments and credits, the total of purchases, any fees and interest, and the closing balance or amount owing.
- **A transaction list** with a date, a description and an amount. Payments, refunds and other credits are usually marked in some way: a "CR" after the amount, a minus sign, or a separate column.

What's usually missing is a balance column next to each transaction. Bank statements normally have one, and it is the best tool for checking a conversion, because every row can be tested against it. On a card statement, you can only check the statement as a whole.

## How the totals check works

Without a running balance, the check is done on totals. For a credit card, where the balance is what you owe:

> opening balance + purchases + fees + interest - payments and credits = closing balance

A made-up example: the statement opens with $1,200.00 owing. During the month there are $845.50 of purchases, a $30.00 annual fee and $18.40 of interest, and a $1,000.00 payment. The closing balance should be 1,200.00 + 845.50 + 30.00 + 18.40 - 1,000.00 = $1,093.90. If the transactions you extracted don't produce the closing balance printed on the statement, something is wrong.

This is how Tallyproof checks statements that have no running balance: it adds up all the transactions and compares opening plus transactions with the closing balance. When a statement does print a running balance, Tallyproof checks every row against it instead and highlights the rows that don't match.

The totals check has one weakness: when it fails, it can't tell you which row is wrong. The size of the difference is a good clue, though.

- **The difference equals one transaction.** A row was probably missed, or an extra row (such as a "previous balance" line) was picked up as a transaction.
- **The difference is twice one transaction.** A row probably has the wrong sign, for example a refund treated as a purchase.
- **The difference is small and odd-looking.** Look for a misread amount, or a foreign currency amount taken instead of the converted amount.

Many statements also print a subtotal of purchases and a subtotal of payments. Comparing those with the totals of your negative and positive rows narrows the search to one side.

## Sign conventions: purchases versus payments

This is where most credit card imports go wrong. There are two points of view.

- **The card issuer's view.** Your balance is money owed to them. A purchase increases it, so statements often print purchases as plain positive numbers and mark payments with "CR".
- **Your view, in your accounting software.** A purchase is money going out, and a payment to the card is money coming in to the card account.

Accounting software uses your view. Xero's instructions for credit card CSV imports say to show payments as positive amounts and purchases as negative amounts, in a single amount column ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)). The OFX standard says the same: amounts are signed from the customer's perspective, so a credit card payment is positive and a purchase is negative ([OFX 2.2 specification](https://financialdataexchange.org/wp-content/uploads/2025/12/OFX-2.2.pdf)).

So when you convert a card statement, the signs usually need to flip compared with how they're printed. Purchases printed as "45.00" become -45.00, and a payment printed as "500.00 CR" becomes 500.00.

QuickBooks Online adds one more wrinkle. Intuit notes that CSV files for credit card accounts may show transactions the other way round, with deposits as negative amounts because paying the card reduces the balance, and says to upload into an account set up as a credit card, not a bank account ([Intuit](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en)).

Whatever software you use, the simple test is the same: before you finish an import, find one purchase and one payment you recognise in the preview and check which way each one goes.

## Converting with Tallyproof

1. **Download the statement** as a PDF from your card issuer's website. Check it's a text PDF by trying to select a word; scanned statements can't be read.
2. **Open [Tallyproof](https://tallyproof.pages.dev)** and choose the PDF. It is read in your browser with pdf.js and isn't uploaded anywhere. You can confirm this in your browser's developer tools (Network tab).
3. **Check the result.** Tallyproof works out which amounts are purchases and which are credits from markers such as "CR" and minus signs, and aims to write them from your point of view: purchases negative, payments and refunds positive. Check a purchase and a payment you recognise. Then it checks opening balance plus transactions against the closing balance. If the check fails, compare the output with the PDF using the clues above. If a whole column has been read the wrong way, you can change the column's role in the converter and the check runs again.
4. **Export.** The free version exports one statement at a time as a generic CSV, a Xero CSV or a QuickBooks Online CSV. Pro (US$9 a month or US$69 a year) and the one-off Catch-up Pass (US$19 for 30 days) add OFX and QIF exports and let you convert many statements at once, merged into one file.

Amounts need to be printed with two decimal places (such as 45.00); statements that print whole-dollar amounts aren't supported.

## Things on card statements to watch for

- **Foreign currency purchases** often show the original amount and the converted amount on the same line, sometimes with a separate overseas transaction fee. Only the converted amount, in your account's currency, belongs in the amount column. Fees should be their own rows.
- **Interest and fees** often sit at the end of the list or in the summary box. They are real transactions and must be in the file, or the totals won't agree.
- **Refunds** are credits, so they should be positive, like payments.
- **Lines that aren't transactions**, such as "Previous balance" or "Closing balance", must not end up as rows.
- **Additional cardholders.** Some statements list each card's transactions in a separate section. All of them belong to the one account.

## Importing the file

- **Xero:** import the Xero CSV into the credit card account, and check a purchase and a payment on the review screen. See [importing PDF bank statements into Xero](/guides/import-bank-statements-into-xero/).
- **QuickBooks Online:** upload into a credit card account, and check the direction of a purchase and a payment at the mapping step. See [importing PDF bank statements into QuickBooks Online](/guides/import-bank-statements-into-quickbooks-online/).
- **MYOB:** MYOB needs OFX or QIF, so this is a Pro feature. See [importing bank statements into MYOB](/guides/import-bank-statements-into-myob/).

After importing, reconcile the card account using the closing balance on the statement. If your software agrees with the statement, the conversion was complete. For more ways to test a conversion, see [how to check a converted bank statement is accurate](/guides/check-converted-bank-statement-is-accurate/).

## Sources

- Xero Central, "Import a bank statement in CSV format": https://central.xero.com/s/article/Import-a-CSV-bank-statement (credit card payments positive, purchases negative; single amount column)
- Financial Data Exchange, Open Financial Exchange Specification 2.2: https://financialdataexchange.org/wp-content/uploads/2025/12/OFX-2.2.pdf (amounts signed from the customer's perspective)
- Intuit, "Format CSV files in Excel to get bank transactions into QuickBooks": https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en (credit card CSV tips)

Checked on 2 October 2026.
