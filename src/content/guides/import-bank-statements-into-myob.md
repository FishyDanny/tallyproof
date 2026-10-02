---
title: "How to import PDF bank statements into MYOB Business and AccountRight"
description: "MYOB imports bank statements as QIF or OFX files, not CSV or PDF. How to convert PDF statements, import them, and avoid duplicates with bank feeds."
slug: import-bank-statements-into-myob
---

If you are catching up on bookkeeping in MYOB and the bank feed doesn't reach back far enough, the transactions you need are usually sitting in PDF statements. MYOB can't import a PDF, and, unlike Xero and QuickBooks Online, it doesn't import CSV bank statements either. This guide explains what MYOB does accept and how to get there.

## Which file formats MYOB accepts

According to MYOB's support article on importing bank and credit card statements ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)):

- **MYOB Business in a browser** imports **.QIF** or **.OFX** files. For QIF files, MYOB prefers dates in dd/mm/yy format.
- **AccountRight on the desktop** imports **OFX, QFX, QIF and OFC** files.
- Statement files must be **less than 10 MB**.

CSV and PDF are not on either list. If you have used other converters that only produce CSV, that's why MYOB rejects the file.

**What this means for Tallyproof.** Tallyproof's free version converts statements to CSV only, which MYOB will not import as a bank statement. To get a file MYOB accepts, you need Tallyproof's OFX or QIF export, which is part of Tallyproof Pro (US$9 a month or US$69 a year) or the Catch-up Pass (US$19, one-off, 30 days of Pro). The Catch-up Pass is designed for exactly this kind of one-off backfill job. We would rather tell you this up front than have you find out at the import step.

AccountRight also has a separate "import data" feature for text files (customers, items, accounts and some other records). We have not confirmed whether it is a practical route for bank statement lines, so this guide sticks to the bank statement import that MYOB documents for this purpose.

## Before you start: dates MYOB will refuse

MYOB won't import transactions dated before the **opening balance date** set in your MYOB file, or before a **lock date** ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)). If you are backfilling a long period, check both settings first. Lines outside the allowed range will not come through, and it is easier to find out now than after the import.

## Step 1: Download the PDF statements

Log in to your online banking and download the PDF statements for the period you need. Open one and try to select a word with your mouse. If the text highlights, it is a text PDF and Tallyproof can read it. If it behaves like a picture (for example a scanned paper statement), it can't be converted yet.

Note the first and last date of the period. You'll need them in Step 4.

## Step 2: Convert the statements to OFX or QIF

1. Open [Tallyproof](https://tallyproof.pages.dev) in your browser and enter your licence key to unlock Pro.
2. Add your PDF statements. You can add several at once. They are read on your own computer and are not uploaded anywhere; the source code is open source if you want to check.
3. Tallyproof checks every transaction against the running balance printed on the statement (previous balance plus amount should equal the printed balance) and flags any row that doesn't match. For statements with no running balance, as on most credit cards, it checks that the opening balance plus all transactions equals the closing balance.
4. Review every flagged row against the PDF and note any that are wrong, so you can correct them in MYOB after importing. The balance check is about amounts, so also give the dates and descriptions a quick look.
5. Export as **OFX**. We recommend OFX over QIF: both MYOB Business and AccountRight accept it, and OFX stores dates in a fixed year-month-day form that cannot be misread, while QIF dates depend on the date format setting. If you are importing many statements for the same account, you can merge them into one file, as long as it stays under MYOB's 10 MB limit.

## Step 3: Import the file into MYOB

The steps below are from MYOB's support article, checked on 2 October 2026 ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

**MYOB Business (browser)**

1. Go to the **Banking** menu and choose **Banking hub**.
2. Click the three dots and select **Import statement**.
3. On the bank statement import history page, click **Import statement**.
4. Choose the bank account, then click **Import statement file**.
5. Click **Browse**, select your OFX or QIF file, and click **Import**.

**AccountRight (desktop)**

1. Go to the **Banking** command centre and click **Reconcile Accounts**.
2. Choose the account and enter the closing balance from the statement.
3. Click **Get Statement** and select your OFX or QIF file.
4. Match or add any transactions that weren't matched automatically.

MYOB updates its menus from time to time. If a label has changed, the MYOB support article above has the current wording.

## Step 4: Avoid duplicates with the bank feed

If the account has a bank feed, the imported statement and the feed can overlap and give you the same transaction twice.

Before importing, find the earliest date that came in through the bank feed and compare it with the date range of your file. Only import statements for the period before the feed starts. The fix MYOB documents for duplicates is to delete the whole imported statement and start again (see below), so it pays to avoid overlaps before you import:

- convert and import only the statements that end before the feed's first transaction;
- for the one statement that straddles the feed start date, consider entering its pre-feed transactions by hand, since there are usually only a few;
- take extra care with the day the feed started, since some of that day's transactions may already be in MYOB and others may not.

If duplicates do get in, MYOB's advice is to delete the imported bank statement, then import a new one whose date range doesn't include transactions already in MYOB ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

## Step 5: Match, allocate and reconcile

Imported transactions appear alongside your feed transactions, ready to match or allocate. Work through them as usual, then reconcile the account for each statement period using the closing balance printed on the PDF. If MYOB's balance agrees with the statement, the period is done. If not, look for a missing statement, an overlap imported twice, or a flagged row that wasn't corrected.

## If you only have one or two statements

For one or two short statements, typing the transactions into MYOB by hand may be quicker than buying anything. You can still use the free version of Tallyproof to get a verified CSV and work from that, since every row will already have been checked against the statement's balances.

## Sources

- MYOB, "Import bank and credit card statements": https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements (accepted formats for browser and desktop, 10 MB limit, import steps, opening balance and lock dates, duplicates)
- MYOB, "Importing data": https://www.myob.com/au/support/myob-business/import-export/importing-data (AccountRight's text-file import and bank statement formats)
