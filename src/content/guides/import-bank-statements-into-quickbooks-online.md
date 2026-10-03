---
title: "How to import PDF bank statements into QuickBooks Online"
description: "Convert PDF bank statements to a QuickBooks Online CSV in your browser, upload them to QuickBooks Online, and avoid duplicates with your bank feed."
slug: import-bank-statements-into-quickbooks-online
---

QuickBooks Online can pull transactions from a connected bank feed, but when you are catching up on older periods, or on an account that has no feed, the records you have are often PDF statements. Outside the United States, QuickBooks Online's file upload doesn't take PDF statements, so you need to turn them into a file it does accept. This guide covers that, step by step.

**In the United States**, Intuit's upload article (updated August 2026) says QuickBooks Online can now read PDF and image statements itself, extracting the transactions automatically. If that option appears in your QuickBooks and works for your statements, you may not need a converter at all. A converter is still useful if you'd rather not send statements to another service, or if you want every row checked against the printed running balance before importing.

## What QuickBooks Online accepts

QuickBooks Online's "Upload from file" accepts CSV, TXT, QBO and OFX files. Intuit's help article sets these limits ([Intuit](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US)):

- the file must be in English;
- the file must be 350 KB or smaller;
- up to 1,000 transaction lines per upload.

A CSV file must use one of two layouts ([Intuit](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en)):

- **3-column:** Date, Description, Amount. Money out is a negative amount and money in is positive.
- **4-column:** Date, Description, Credit, Debit. Money in and money out go in separate columns as positive numbers.

Intuit also asks for dates in one consistent format, blank cells instead of zeros, and plain "Credit" and "Debit" headings (without the word "amount").

Either layout works. The 3-column layout is the simpler one to check by eye, because every row has exactly one number and its sign tells you the direction.

## Step 1: Download the PDF statements

Log in to your online banking and download the statements for the period you are missing. Before converting, open one and try to select some text with your mouse. If you can highlight words, it is a text PDF and can be converted. If it behaves like a picture (for example a scanned paper statement), Tallyproof can't read it yet.

Write down the first and last date you need. You will use them in Step 4.

## Step 2: Convert the PDF to a QuickBooks Online CSV

1. Open [Tallyproof](https://tallyproof.pages.dev) in your browser.
2. Choose a PDF statement. It is read on your own computer and is not uploaded anywhere. You can check this in your browser's developer tools (Network tab).
3. Tallyproof extracts the transactions and checks every row against the running balance printed on the statement (previous balance plus the transaction amount should equal the printed balance). Rows that don't match are flagged. For statements without a running balance, such as most credit card statements, it checks that the opening balance plus all transactions equals the closing balance.
4. Review any flagged rows against the PDF. The balance check confirms that the amounts add up; it doesn't check dates or descriptions, so glance over those as well.
5. Choose **QuickBooks Online CSV** and download the file.

Converting one statement at a time is free and needs no account. With Pro or the Catch-up Pass you can convert many statements at once, or merge them into one file. The free CSV is all QuickBooks Online needs.

If you merge many statements into one file, keep QuickBooks' limits in mind: 1,000 lines and 350 KB per upload. For a large catch-up job, upload a few months at a time.

## Step 3: Upload the file to QuickBooks Online

Intuit's current steps are ([Intuit](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US)):

1. Go to **All apps**, select **Accounting**, then select **Bank transactions**.
2. If you see a tile for the account, select it, then open the **Link account** dropdown and choose **Upload from file**.
3. Select **Drag and drop or select files**, choose your CSV and select **Continue**.
4. Choose the QuickBooks account to upload into (or add a new one) and select **Continue**.
5. Match the columns in your file to the QuickBooks fields and select **Continue**.
6. Select the transactions to import, select **Continue**, then **Yes** and **Done**.

Menu labels differ slightly between regions and versions of QuickBooks Online. If yours look different, the region-specific help article for your country has the current wording.

**Check the direction of money at the mapping step.** Before you continue past the column-matching screen, look at the preview and confirm that a payment you recognise shows as money out and a deposit shows as money in. This matters most with the 4-column layout, where it is easy to swap the Credit and Debit columns. If they are the wrong way round, go back and swap the mapping.

**Credit cards.** Intuit notes that CSV files for credit card accounts may show transactions in reverse ([Intuit](https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en)). Make sure you upload into an account set up as a credit card, and check a purchase and a payment in the preview.

## Step 4: Avoid duplicates with the bank feed

If the account also has a bank feed, the two sources can overlap. QuickBooks won't always know that a line from your file and a line from the feed are the same transaction.

1. In **Bank transactions**, find the earliest date that came in through the feed.
2. Compare it with the date range of the file you are uploading.
3. Where they overlap, untick those transactions at the "select the transactions to import" step, or delete the rows from the CSV before uploading.

Take extra care with the day the feed started, since some of that day's transactions may already be there and others may not.

## Step 5: Categorise, match and reconcile

Uploaded transactions appear in the **For review** list, the same as feed transactions. Categorise them or match them to existing invoices, bills and payments.

Then reconcile the account for each statement period, using the closing balance printed on the PDF as the statement ending balance. If QuickBooks agrees with the statement, the period is done. If it doesn't, look for a missing statement, a doubled-up overlap, or a flagged row that wasn't fixed.

## Sources

- Intuit, "Manually upload transactions into QuickBooks Online": https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US (upload steps, supported file types, 350 KB and 1,000-line limits, PDF and image upload in the US as of the August 2026 update)
- Intuit, "Format CSV files in Excel to get bank transactions into QuickBooks": https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-get-bank-transactions/L4BjLWckq_ROW_en (3-column and 4-column layouts, formatting rules, credit card note)

Steps checked on 2 October 2026. QuickBooks Online changes its menus from time to time; Intuit's help articles have the current wording.
