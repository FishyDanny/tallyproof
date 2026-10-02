---
title: "CSV vs OFX vs QIF: which bank statement format to use"
description: "What CSV, OFX and QIF bank statement files are, which of Xero, QuickBooks Online and MYOB accepts each, and the date-format traps in QIF and CSV files."
slug: csv-vs-ofx-vs-qif-bank-statement-formats
---

When you import a bank statement into accounting software, the import screen usually asks for one of three file types: CSV, OFX or QIF. They all carry the same basic information (a date, an amount and a description for each transaction), but they differ in how strictly that information is defined, and that affects how likely an import is to go wrong.

## The short answer

| Software | CSV | OFX | QIF |
|---|---|---|---|
| Xero | Yes | Yes (recommended) | Yes |
| QuickBooks Online | Yes (3 or 4 columns) | Yes | Not listed |
| MYOB Business and AccountRight | No (for bank statements) | Yes | Yes |

Sources for each row are below and at the end of this guide.

- **Going into Xero or QuickBooks Online:** CSV works and is the easiest to check by eye. OFX is the more robust choice where you have it.
- **Going into MYOB:** you need OFX or QIF. Choose OFX.
- **Going into a spreadsheet:** CSV.

## CSV: simple, flexible, and different everywhere

A CSV (comma-separated values) file is a plain text table: one line per transaction, with commas between the fields. You can open it in any spreadsheet, which makes it easy to read and fix.

The catch is that CSV has never been strictly defined. RFC 4180, the document usually pointed to as the description of the format, notes that it had never been formally documented ([RFC 4180](https://www.rfc-editor.org/rfc/rfc4180)). In practice, every program decides what columns it wants:

- **Xero** needs at least a date and an amount, with money in and money out in the same column: income positive, expenses negative (a minus sign or brackets). It accepts a long list of date formats, and won't import a CSV with more than 100,000 rows ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)).
- **QuickBooks Online** accepts a 3-column layout (Date, Description, Amount) or a 4-column layout (Date, Description, Credit, Debit), with dates in one consistent format ([Intuit](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en)). Uploads are limited to 350 KB and 1,000 lines ([Intuit](https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU)).
- **MYOB** doesn't import bank statements as CSV at all. MYOB Business takes QIF or OFX, and AccountRight takes OFX, QFX, QIF and OFC ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

That's why Tallyproof's free version has separate exports: a generic CSV for spreadsheets, a Xero CSV and a QuickBooks Online CSV, each laid out for its destination.

CSV's other weakness is that it's easy to damage by accident. Open it in Excel, let Excel reformat the dates or strip zeros, save, and the file you import is no longer the file you exported. See [bank statement PDF to Excel](/guides/bank-statement-pdf-to-excel/) for how to avoid that.

## OFX: the structured one

OFX (Open Financial Exchange) is a standard published in 1997 by Microsoft, Intuit and CheckFree for exchanging financial data ([Wikipedia](https://en.wikipedia.org/wiki/Open_Financial_Exchange)). An OFX statement file wraps each transaction in labelled fields, so there's no guessing which column is which.

Three features make it more dependable than CSV:

- **One date format.** The specification defines a single format for dates, year first: YYYYMMDD, optionally followed by a time ([OFX 2.2 specification](https://financialdataexchange.org/wp-content/uploads/2025/12/OFX-2.2.pdf)). A date in an OFX file can't be read as the wrong day or month.
- **Signs are defined.** Amounts in statement transactions are signed by their effect on the account, from the customer's point of view: a debit is negative, and for a credit card a payment is positive and a purchase negative.
- **Transaction IDs.** Each transaction carries an ID (FITID) that is unique within the account, so that software can spot a transaction it has already received.

Xero recommends OFX where possible, because it can be imported without changes ([Xero Central](https://central.xero.com/s/article/About-manually-importing-bank-statements)). QuickBooks Online lists .ofx and .qbo among its upload types ([Intuit](https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU)). QFX and QBO are Intuit's own variants of OFX.

One caution about transaction IDs. When OFX comes from your bank, the IDs are the bank's. When you create an OFX file from a PDF, with Tallyproof or any other converter, the IDs are generated from the statement and won't match the IDs your bank feed uses. So don't rely on your accounting software to recognise that a converted transaction is already there from a feed. Check the date ranges yourself.

## QIF: the older one

QIF (Quicken Interchange Format) is an older plain-text format from Quicken. Each transaction is a short block of lines, each starting with a letter: D for the date, T for the amount, P for the payee, M for a memo, and a caret (^) to end the entry ([Wikipedia](https://en.wikipedia.org/wiki/Quicken_Interchange_Format)). The first line says what kind of account it is, for example `!Type:Bank` or `!Type:CCard`.

QIF has been on its way out for years. From its 2006 version, Quicken stopped importing QIF into checking, savings and credit card accounts, though the Australian version kept it ([Wikipedia](https://en.wikipedia.org/wiki/Quicken_Interchange_Format)). It has no transaction IDs, and Xero says to prefer OFX or QFX over QIF when your bank offers them ([Xero Central](https://central.xero.com/s/article/Import-a-QIF-bank-statement)). It's still useful as a fallback, and MYOB accepts it.

## Date-format risks in QIF and CSV

Neither QIF nor CSV says which order a date is in. The QIF format allows dates with or without leading zeros and with two- or four-digit years ([Wikipedia](https://en.wikipedia.org/wiki/Quicken_Interchange_Format)), and a CSV date is just text. So 03/04/2026 could be 3 April or 4 March, depending on what the importing software assumes.

What happens next depends on the software:

- **Xero** asks you to confirm the format when a file contains dates that could be read more than one way, and applies your choice to the whole statement and to future CSV imports ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)). If you pick wrong once, later imports inherit the mistake.
- **MYOB** suggests choosing dd/mm/yy if your bank gives you a choice of date formats for QIF ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).
- **QuickBooks Online** asks for one consistent date format throughout the file ([Intuit](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en)).

Two habits avoid most problems. First, check the preview for a transaction dated after the 12th of a month: a date like 25 April can only be read one way, so if it appears correctly the rest of the file is probably right too. Second, where you have the choice, use OFX, which has no ambiguity.

## Which Tallyproof export to choose

- **Excel or Google Sheets:** CSV (free).
- **Xero:** Xero CSV (free), or OFX with Pro.
- **QuickBooks Online:** QuickBooks Online CSV (free), or OFX with Pro.
- **MYOB:** OFX with Pro or the Catch-up Pass. QIF is there if you need it.

OFX and QIF exports are part of Pro (US$9 a month or US$69 a year) and the one-off Catch-up Pass (US$19 for 30 days of Pro). Whatever format you choose, every row is checked against the statement's balances before you download, so the format decides how the data travels, not whether it's right.

## Sources

- RFC 4180, "Common Format and MIME Type for Comma-Separated Values (CSV) Files": https://www.rfc-editor.org/rfc/rfc4180
- Xero Central, "Import a bank statement in CSV format": https://central.xero.com/s/article/Import-a-CSV-bank-statement
- Xero Central, "About manually importing bank statements": https://central.xero.com/s/article/About-manually-importing-bank-statements
- Xero Central, "Import a QIF bank statement": https://central.xero.com/s/article/Import-a-QIF-bank-statement
- Intuit, "Manually upload transactions into QuickBooks Online" (Australia): https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU
- Intuit, "Format CSV files in Excel to get bank transactions into QuickBooks": https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en
- MYOB, "Import bank and credit card statements": https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements
- Financial Data Exchange, Open Financial Exchange Specification 2.2: https://financialdataexchange.org/wp-content/uploads/2025/12/OFX-2.2.pdf
- Wikipedia, "Open Financial Exchange": https://en.wikipedia.org/wiki/Open_Financial_Exchange
- Wikipedia, "Quicken Interchange Format": https://en.wikipedia.org/wiki/Quicken_Interchange_Format

Checked on 2 October 2026.
