---
title: "PDF bank statement to MYOB (OFX and QIF) converter"
description: "MYOB imports bank statements as OFX or QIF, not CSV or PDF. Convert PDF statements to OFX in your browser with Tallyproof Pro, checked row by row."
descriptionEarlyAccess: "MYOB imports bank statements as OFX or QIF, not CSV or PDF. Tallyproof's OFX and QIF exports are not available yet; this page explains what MYOB needs."
slug: bank-statement-to-myob
heading: "Convert PDF bank statements for MYOB"
intro: "MYOB Business and AccountRight import bank statements as OFX or QIF files. Tallyproof Pro converts PDF statements to OFX or QIF in your browser, without uploading them, and checks every row against the statement's balances."
introEarlyAccess: "MYOB Business and AccountRight import bank statements as OFX or QIF files. Tallyproof does not export those formats yet, so it can't produce a file MYOB accepts today. It can still convert a statement to CSV in your browser, checked row by row, without uploading anything."
---

<!-- if prices -->

## You'll need Pro or the Catch-up Pass for MYOB

We'd rather say this up front. MYOB doesn't import bank statements as CSV or PDF. MYOB Business imports **.QIF** or **.OFX** files, and AccountRight imports OFX, QFX, QIF and OFC files ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

Tallyproof's free version exports CSV only. OFX and QIF exports are part of:

- **Pro:** US$9 a month or US$69 a year, for regular work.
- **The Catch-up Pass:** US$19 once, for 30 days of Pro. It doesn't renew, and it's designed for one-off jobs like backfilling a year of statements into MYOB.

You can try the converter above for free first. It will show you the extracted transactions and the balance check for your statement before you decide whether to buy. If you only have one or two short statements, typing them into MYOB by hand may be cheaper.

## Which format to choose

Choose **OFX**. Both MYOB Business and AccountRight accept it, and OFX writes dates year first (YYYYMMDD), so they can't be misread. QIF is there as a fallback. If you use QIF, choose a day-first date format, since MYOB suggests dd/mm/yy dates for QIF where you have the choice ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

For credit card statements, Tallyproof's OFX and QIF files use the credit card account type when the statement's balance behaves like a card balance. Check a purchase and a payment after importing.

<!-- else -->

## OFX and QIF exports are not available yet

We'd rather say this up front. MYOB doesn't import bank statements as CSV or PDF. MYOB Business imports **.QIF** or **.OFX** files, and AccountRight imports OFX, QFX, QIF and OFC files ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

Tallyproof's free version exports CSV only, and its OFX and QIF exports are not available yet. They are planned for a paid plan later, and we'll announce the price before anything is charged. Until then, Tallyproof can't produce a file MYOB accepts.

You can still convert a statement for free. The converter above shows the extracted transactions and the balance check for your statement, which is a verified list to work from. If you only have one or two short statements, typing them into MYOB by hand may be quicker.

## Which format MYOB wants

OFX. Both MYOB Business and AccountRight accept it, and OFX writes dates year first (YYYYMMDD), so they can't be misread. QIF is the fallback. If you use QIF, choose a day-first date format, since MYOB suggests dd/mm/yy dates for QIF where you have the choice ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

<!-- endif -->

## Limits to know about

- **MYOB's file size limit** is 10 MB per statement file.
- **Dates MYOB won't accept.** Transactions dated before the opening balance date (MYOB Business) or conversion month (AccountRight), or before a lock date, won't import ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).
- **Text PDFs only.** If you can't select words in the PDF, it's a scan and can't be read.
- **Amounts need two decimal places,** such as 45.00.

## Why MYOB users need this

MYOB bank feeds don't bring in history. MYOB says the first feed you receive has transactions dated from when the feed was approved ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-feeds/setting-up-bank-feeds)), so anything before that has to come from imported statements. If the only record you have for that period is PDF statements, they need converting.

## How the check works

Tallyproof tests every transaction against the running balance printed on the statement: the previous balance plus the amount should equal the printed balance. Rows that don't match are highlighted so you can compare them with the PDF before importing. Statements without a running balance, such as most credit card statements, are checked as a whole: opening balance plus all transactions should equal the closing balance.

## Importing many months

<!-- if prices -->

With Pro or the pass, you can add many statements at once and merge them into one file, with rows repeated across overlapping statements removed. MYOB suggests importing and reconciling one month at a time when you have several months to do ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)), so you may prefer to export a file per statement.

<!-- else -->

MYOB suggests importing and reconciling one month at a time when you have several months to do ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)), so work through your statements one at a time.

<!-- endif -->

Stop at the date your bank feed started. MYOB's fix for duplicates is to delete the imported statement and import again without the overlapping dates, so avoid the overlap before you import.

## Step-by-step guides

- [How to import PDF bank statements into MYOB](/guides/import-bank-statements-into-myob/)
- [CSV vs OFX vs QIF: which format to use](/guides/csv-vs-ofx-vs-qif-bank-statement-formats/)
- [Catch-up bookkeeping from old bank statements](/guides/catch-up-bookkeeping-old-bank-statements/)

## Sources

- MYOB, "Import bank and credit card statements": https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements (formats, 10 MB limit, date restrictions, one month at a time, duplicates)
- MYOB, "Connecting bank accounts to MYOB": https://www.myob.com/au/support/myob-business/banking/bank-feeds/setting-up-bank-feeds (feed transactions start from approval)

Checked on 2 October 2026.
