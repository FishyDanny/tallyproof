---
title: "PDF bank statement to Xero CSV converter"
description: "Convert PDF bank statements to a Xero-ready CSV in your browser. Every row is checked against the statement's balances, and nothing is uploaded."
slug: bank-statement-to-xero
heading: "Convert PDF bank statements for Xero"
intro: "Turn a PDF bank or credit card statement into a CSV file Xero can import. Your statement is read in your browser and never uploaded, and every row is checked against the balances printed on it."
---

## Which format to choose

Choose **Xero CSV** in the converter above. It's free, one statement at a time, with no account needed.

The Xero CSV puts money in and money out in a single amount column, with money in as positive amounts and money out as negative, which is the layout Xero asks for ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)). Before you download, pick the date order your organisation normally uses. If a file contains dates that could be read more than one way, Xero asks you to confirm the format and applies your choice to future CSV imports too ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)), so make sure it's right the first time.

If you have Pro or the Catch-up Pass, **OFX** is a good alternative. Xero recommends OFX where possible ([Xero Central](https://central.xero.com/s/article/About-manually-importing-bank-statements)), and OFX dates are always written year first, so they can't be misread. Either format works; CSV is easier to look over before importing.

## Why convert at all?

Xero imports statement files in OFX, QFX, QuickBooks, QIF and CSV formats. Its general help article says PDF bank statements can't be imported ([Xero Central](https://central.xero.com/s/article/About-manually-importing-bank-statements)). Xero does offer PDF extraction for supported banks in the US and Canada ([Xero blog](https://blog.xero.com/us/news-events/import-transaction-data-into-xero/)), but if you're elsewhere, or your bank isn't covered, the PDF needs converting first.

You'll usually need this when the bank feed doesn't reach back far enough, for an account that has no feed, or when catching up on old records.

## How the check works

Tallyproof reads each transaction and tests it against the running balance printed on the statement: the previous balance plus the amount should equal the printed balance. Rows that don't match are highlighted so you can compare them with the PDF before importing. Statements without a running balance, such as most credit card statements, are checked as a whole: opening balance plus all transactions should equal the closing balance.

The check proves the amounts. Give the dates and descriptions a quick look too.

## Credit cards

For a credit card account, Xero wants payments as positive amounts and purchases as negative ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)). Tallyproof aims to write card statements that way, working from the "CR" markers and signs on the statement, but on Xero's review screen, check one purchase and one payment you recognise before completing the import. See [converting a credit card statement to CSV](/guides/convert-credit-card-statement-to-csv/).

## Limits to know about

- **Text PDFs only.** If you can't select words in the PDF, it's a scan and can't be read.
- **Amounts need two decimal places,** such as 45.00.
- **Xero's row limit:** a CSV import can't have more than 100,000 rows ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)).
- **Bank feed overlaps.** Xero warns that importing a statement manually as well as through a feed can create duplicate statement lines ([Xero Central](https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK)). Only import the period before your feed starts.

## Many statements?

The free version converts one statement at a time. With Pro (US$9 a month or US$69 a year) or the Catch-up Pass (US$19 one-off, 30 days of Pro), you can add many statements at once and merge them into one file, with rows repeated across overlapping statements removed.

## Step-by-step guides

- [How to import PDF bank statements into Xero](/guides/import-bank-statements-into-xero/)
- [Why bank feeds only go back so far](/guides/import-historical-transactions-bank-feed-limit/)
- [Catch-up bookkeeping from old bank statements](/guides/catch-up-bookkeeping-old-bank-statements/)

## Sources

- Xero Central, "Import a bank statement in CSV format": https://central.xero.com/s/article/Import-a-CSV-bank-statement
- Xero Central, "About manually importing bank statements": https://central.xero.com/s/article/About-manually-importing-bank-statements
- Xero Central, "Find and remove duplicate bank statement lines": https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK
- Xero Blog, "Making it easy to import transaction data into Xero": https://blog.xero.com/us/news-events/import-transaction-data-into-xero/

Checked on 2 October 2026.
