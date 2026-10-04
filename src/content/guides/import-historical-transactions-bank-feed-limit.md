---
title: "Why bank feeds only go back so far, and how to import older transactions"
description: "How much history Xero, QuickBooks Online and MYOB bank feeds bring in, according to each vendor, and how to import older transactions a feed can't reach."
slug: import-historical-transactions-bank-feed-limit
---

Bank feeds are the easiest way to get transactions into accounting software, so it's a surprise when you connect one and find it only reaches back a few months, or doesn't reach back at all. If you're setting up new software for an established business or catching up on old records, the transactions you need are often older than anything the feed will deliver.

This guide explains why that happens, what each of Xero, QuickBooks Online and MYOB says about how far back its feeds go, and how to fill in the older periods.

## Why feeds have a limit

A bank feed doesn't read your whole account history. Your accounting software receives whatever transactions the bank or its data provider makes available through the connection, and that varies by bank, by account type and by how the feed is set up. Xero, for instance, says it relies on banks to make transactions available for import ([Xero Central](https://central.xero.com/s/article/Bank-feeds-UK)). Some connections can send a year or two of history when you first connect; others start on the day the feed was approved.

So the answer to "how far back will my feed go?" is always partly "it depends on your bank". The figures below are what each vendor publishes.

## Xero

On its Australian website, Xero says you can import up to 12 months of historical data when you first connect a bank feed, and up to 2 years with some banks ([Xero AU](https://www.xero.com/au/accounting-software/connect-your-bank/)). Xero's US and UK pages don't give a figure. The US page says it depends on your bank, and that you may be given the option to pull historical data when setting up the feed ([Xero US](https://www.xero.com/us/accounting-software/connect-your-bank/)).

During setup, Xero asks you to confirm the date you'd like transactions to start from, and says you can import historic transactions if the feed supports it ([Xero Central](https://central.xero.com/s/article/About-manually-importing-bank-statements)).

For anything earlier, Xero's guidance is to import bank statements manually if you're missing statement lines dated before the feed started. It accepts OFX, QFX, QuickBooks (QBO), QIF and CSV files, and its general article says PDF statements can't be imported ([Xero Central](https://central.xero.com/s/article/About-manually-importing-bank-statements)). The exception is North America: Xero offers bank statement extraction from PDFs of supported banks for customers in the US and Canada, through Hubdoc ([Xero blog](https://blog.xero.com/us/news-events/import-transaction-data-into-xero/)).

## QuickBooks Online

A figure of 90 days is widely repeated for QuickBooks bank feeds, but Intuit's own help gives a range. Intuit's US article says download timespans vary by bank, from 90 days up to 24 months, and that you choose a start date from a date range when connecting ([Intuit US](https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/connect-bank-credit-card-accounts-quickbooks/L4yDAHMNH_US_en_US)). The Australian version says you can import transactions from up to 24 months ago ([Intuit AU](https://quickbooks.intuit.com/learn-support/en-au/help-article/banking/connect-bank-credit-card-accounts-quickbooks/L4yDAHMNH_AU_en_AU)). How far your own feed reaches depends on your bank.

For older transactions, QuickBooks Online's **Upload from file** accepts CSV, TXT, QBO and OFX files, up to 350 KB and 1,000 lines per upload ([Intuit AU](https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU)).

In the US, Intuit's upload article now also accepts account statements as PDF or image files: AI extracts the transactions, and Intuit says some items may be reviewed by its team of experts ([Intuit US](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US)). The Australian article doesn't list PDF. If you use the PDF route, bear in mind that your statement is sent to Intuit to be processed.

## MYOB

MYOB's feeds don't backfill. MYOB says the first bank feed you receive has transactions dated from when the feed was approved, and earlier transactions aren't included ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-feeds/setting-up-bank-feeds)).

For the period before the feed, MYOB says to import bank statements. If you've set up a feed, you only need to import statements for transactions from before it was activated ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)). MYOB Business imports QIF or OFX files and AccountRight imports OFX, QFX, QIF and OFC, each under 10 MB. Transactions dated before the opening balance date, conversion month or a lock date won't import.

## What to do for older periods

In order of preference:

<!-- if prices -->

1. **Download a file from your bank.** If online banking offers CSV, OFX or QIF downloads for the period you need, use those. They come straight from the bank and need no conversion. How far back these downloads go also varies by bank.
2. **Convert the PDF statements.** If PDFs are all you have, convert them to a format your software accepts. With [Tallyproof](https://tallyproof.pages.dev), the PDF is read in your browser and never uploaded. Every row is checked against the running balance printed on the statement, or, where there's no running balance, the opening and closing balances are checked. The free version exports Xero CSV and QuickBooks Online CSV, one statement at a time. MYOB needs OFX or QIF, which come with Pro or the Catch-up Pass, as does converting many statements at once into one merged file.
3. **Enter a few transactions by hand.** If only a handful are missing, typing them may be quicker. Xero notes that you can create the transactions and mark them as reconciled ([Xero Central](https://central.xero.com/s/article/About-manually-importing-bank-statements)).

<!-- else -->

1. **Download a file from your bank.** If online banking offers CSV, OFX or QIF downloads for the period you need, use those. They come straight from the bank and need no conversion. How far back these downloads go also varies by bank.
2. **Convert the PDF statements.** If PDFs are all you have, convert them to a format your software accepts. With [Tallyproof](https://tallyproof.pages.dev), the PDF is read in your browser and never uploaded. Every row is checked against the running balance printed on the statement, or, where there's no running balance, the opening and closing balances are checked. The free version exports Xero CSV and QuickBooks Online CSV, one statement at a time. MYOB needs OFX or QIF, which Tallyproof can't export yet, and converting many statements at once into one merged file is not available yet.
3. **Enter a few transactions by hand.** If only a handful are missing, typing them may be quicker. Xero notes that you can create the transactions and mark them as reconciled ([Xero Central](https://central.xero.com/s/article/About-manually-importing-bank-statements)).

<!-- endif -->

## Watch the boundary with the feed

The riskiest part is where the imported history meets the feed. Xero warns that duplicate statement lines can occur when a statement is imported manually and the same transactions also come through a bank feed ([Xero Central](https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK)). Before importing:

- find the date of the earliest transaction the feed brought in;
- import only what's dated before it;
- compare the feed's first day line by line, since it may be partly covered.

Converted OFX files carry transaction IDs generated by the converter, not the bank's, so they won't match the IDs in your feed. Don't rely on your software to catch the overlap; check the dates yourself.

## Reconcile as you go

Import one period at a time and reconcile each against the closing balance on the statement before moving on. MYOB recommends importing and reconciling one month at a time when you have several months to do ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)). For the full workflow, see [catch-up bookkeeping from old bank statements](/guides/catch-up-bookkeeping-old-bank-statements/), and for step-by-step imports see the guides for [Xero](/guides/import-bank-statements-into-xero/), [QuickBooks Online](/guides/import-bank-statements-into-quickbooks-online/) and [MYOB](/guides/import-bank-statements-into-myob/).

## Sources

- Xero, "Connect your bank to Xero" (Australia): https://www.xero.com/au/accounting-software/connect-your-bank/ (up to 12 months, up to 2 years with some banks)
- Xero, "Connect your bank" (US): https://www.xero.com/us/accounting-software/connect-your-bank/ (history depends on the bank; PDF upload from supported banks)
- Xero Central, "About bank feeds": https://central.xero.com/s/article/Bank-feeds-UK
- Xero Central, "About manually importing bank statements": https://central.xero.com/s/article/About-manually-importing-bank-statements
- Xero Central, "Find and remove duplicate bank statement lines": https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK
- Xero Blog, "Making it easy to import transaction data into Xero": https://blog.xero.com/us/news-events/import-transaction-data-into-xero/ (PDF extraction in the US and Canada)
- Intuit, "Connect bank and credit card accounts to QuickBooks Online" (US): https://quickbooks.intuit.com/learn-support/en-us/help-article/banking/connect-bank-credit-card-accounts-quickbooks/L4yDAHMNH_US_en_US
- Intuit, "Connect bank and credit card accounts to QuickBooks Online" (Australia): https://quickbooks.intuit.com/learn-support/en-au/help-article/banking/connect-bank-credit-card-accounts-quickbooks/L4yDAHMNH_AU_en_AU
- Intuit, "Manually upload transactions into QuickBooks Online" (US): https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US
- Intuit, "Manually upload transactions into QuickBooks Online" (Australia): https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU
- MYOB, "Connecting bank accounts to MYOB": https://www.myob.com/au/support/myob-business/banking/bank-feeds/setting-up-bank-feeds
- MYOB, "Import bank and credit card statements": https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements

Checked on 2 October 2026. Vendors change these pages; their current help articles take precedence.
