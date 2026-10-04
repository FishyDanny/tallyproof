---
title: "PDF bank statement to QuickBooks Online CSV converter"
description: "Convert PDF bank statements to a QuickBooks Online CSV in your browser, checked row by row against the statement's balances. Nothing is uploaded."
slug: bank-statement-to-quickbooks
heading: "Convert PDF bank statements for QuickBooks Online"
intro: "Turn a PDF bank or credit card statement into a CSV file QuickBooks Online can upload. Your statement is read in your browser and never uploaded, and every row is checked against the balances printed on it."
---

## Which format to choose

Choose **QuickBooks Online CSV** in the converter above. It's free, one statement at a time, with no account needed.

QuickBooks Online accepts CSV files in a 3-column layout (Date, Description, Amount) or a 4-column layout (Date, Description, Credit, Debit) ([Intuit](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en)). Tallyproof's QuickBooks Online CSV uses the 3-column layout: one amount per row, negative for money out and positive for money in. Every row has exactly one number, so it's the easier layout to check by eye. Choose your usual date format before downloading and keep it the same for every file.

<!-- if prices -->

With Pro or the Catch-up Pass you can also export **OFX**, which QuickBooks Online accepts too. For most people the free CSV is all QuickBooks needs.

<!-- else -->

For most people the free CSV is all QuickBooks needs.

<!-- endif -->

## Limits to know about

- **Upload limits.** Intuit allows files of 350 KB or less, with up to 1,000 transaction lines per upload ([Intuit](https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU)). For a big catch-up job, upload a few months at a time.
- **Text PDFs only.** If you can't select words in the PDF, it's a scan and can't be read.
- **Amounts need two decimal places,** such as 45.00.
- **Bank feed overlaps.** Don't rely on QuickBooks to spot that a line from your file and a line from the feed are the same transaction. Only upload the period before the feed starts, or untick the overlapping lines when you upload.

## A note for US users: PDF uploads

Intuit's US help article now says QuickBooks Online can take an account statement as a PDF or image: AI extracts the transactions, and some items may be reviewed by Intuit's team of experts ([Intuit US](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US)). The Australian version of the article lists only CSV, TXT, QBO and OFX files. If the PDF upload is available to you, it's an option, but your statement is sent to Intuit to be processed. Converting with Tallyproof keeps the statement on your computer and shows you which rows were proven against the printed balance.

## How the check works

Tallyproof tests every transaction against the running balance printed on the statement: the previous balance plus the amount should equal the printed balance. Rows that don't match are highlighted, so you can compare them with the PDF before uploading. Statements without a running balance, such as most credit card statements, are checked as a whole: opening balance plus all transactions should equal the closing balance.

## Credit cards

Intuit notes that CSV files for credit card accounts may show transactions the other way round, and says to upload into an account set up as a credit card, not a bank account ([Intuit](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en)). At the column-mapping step, check that a purchase you recognise shows as money out and a payment as money in. See [converting a credit card statement to CSV](/guides/convert-credit-card-statement-to-csv/).

## Many statements?

<!-- if prices -->

With Pro (US$9 a month or US$69 a year) or the Catch-up Pass (US$19 one-off, 30 days of Pro), you can convert many statements at once and merge them into one file, with rows repeated across overlapping statements removed. Keep the 1,000-line limit in mind when merging.

<!-- else -->

Tallyproof converts one statement at a time for now, so upload one file per statement. Converting many statements at once and merging them into one file are not available yet. They are planned for a paid plan later, and we'll announce the price before anything is charged.

<!-- endif -->

## Step-by-step guides

- [How to import PDF bank statements into QuickBooks Online](/guides/import-bank-statements-into-quickbooks-online/)
- [Why bank feeds only go back so far](/guides/import-historical-transactions-bank-feed-limit/)
- [How to check a converted bank statement is accurate](/guides/check-converted-bank-statement-is-accurate/)

## Sources

- Intuit, "Format CSV files in Excel to get bank transactions into QuickBooks": https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en
- Intuit, "Manually upload transactions into QuickBooks Online" (Australia): https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU
- Intuit, "Manually upload transactions into QuickBooks Online" (US, updated 24 August 2026): https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US

Checked on 2 October 2026.
