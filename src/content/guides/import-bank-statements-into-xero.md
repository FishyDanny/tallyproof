---
title: "How to import PDF bank statements into Xero (Australia, NZ and UK)"
description: "Xero outside the US and Canada can't import PDF statements. Convert them to Xero CSV in your browser, import them, and avoid duplicates with a bank feed."
slug: import-bank-statements-into-xero
---

If you are catching up on bookkeeping in Xero, sooner or later you need transactions that your bank feed does not have. The usual source is the PDF statements from your online banking. This guide shows how to get those PDFs into Xero as statement lines you can reconcile, without retyping them and without uploading your statements to a conversion website.

It is written for Xero users in Australia, New Zealand and the UK, but the steps work in any region.

## Why you can't just upload the PDF

Xero added direct PDF statement import in May 2024, but only for organisations in the United States and Canada, and only for digital PDFs from supported banks. Users in the UK, Australia, New Zealand and South Africa still cannot upload PDF statements directly ([Parsefield](https://parsefield.com/blog/pdf-bank-statement-to-xero-guide)).

What Xero does accept everywhere is a statement file: CSV, OFX, QIF, QBO or QFX. So the job is to turn each PDF into one of those formats, and CSV is the simplest.

## Why the bank feed doesn't cover it

Bank feeds are the best way to keep Xero up to date, but they only reach back so far. When you first connect a feed, Xero's Australian site says you can bring in up to 12 months of history, and up to 2 years with some banks ([Xero](https://www.xero.com/au/accounting-software/connect-your-bank/)). How much you actually get depends on your bank and the type of account.

That leaves gaps in common situations:

- you are catching up on more than a year of records;
- you are setting up Xero for a business that has been trading for a while;
- the account was closed, or the feed was disconnected for a period;
- an account (often a credit card or a loan) has no feed at all.

For those periods, the PDF statements are what you have.

## Step 1: Download the PDF statements

Log in to your online banking and download the statements for the period you are missing. Past statements are usually in a section called something like "Statements" or "Documents". How far back you can go varies by bank; if you need older statements than are available online, ask your bank for copies.

Check two things before you go further:

- **The PDF has real text.** Open it and try to select a word with your mouse. If you can highlight the text, it is a text PDF and can be converted. If the page behaves like a picture (common with statements that were printed and scanned), it is an image-only PDF. Tallyproof cannot read those yet.
- **You have every statement in the range.** Note the first and last date of the period you need. You will use these dates again in Step 4.

## Step 2: Convert each PDF to a Xero CSV

1. Open [Tallyproof](https://tallyproof.pages.dev) in your browser.
2. Choose a PDF statement. Tallyproof reads it on your computer; the file is not uploaded. You can confirm this in your browser's developer tools (Network tab), and the code is open source.
3. Tallyproof detects the transaction table and checks every row against the running balance printed on the statement: previous balance plus this transaction's amount should equal the printed balance. Rows that don't match are flagged. If the statement has no running balance (most credit cards), it checks that the opening balance plus all transactions equals the closing balance instead.
4. Look at anything flagged and compare it with the PDF before you continue. A flag means the numbers didn't add up, so a row may have been misread, missed or split. The check is about amounts; it doesn't prove that every date and description is right, so give those a quick scan too.
5. Choose **Xero CSV** and download the file.

The free version converts one statement at a time with no account and no limits. If you have dozens of statements, Tallyproof Pro (or the one-off Catch-up Pass) converts them in one go and can merge them into a single file.

## Step 3: Import the CSV into Xero

Xero has moved this button around over the years, so the wording may differ slightly in your organisation. At the time of writing, the route is:

1. Go to **Accounting** and select **Bank accounts**.
2. Find the bank account the statement belongs to. Open its menu (or, from the account's reconciliation screen, click **Manage account**) and select **Import a statement**.
3. Select your CSV file and continue.
4. If prompted, match the columns in the file to Xero's bank statement fields, and select the date format used in the file. Australian, NZ and UK organisations normally use day/month/year.
5. Review the transactions. Untick any line you don't want to import, then complete the import.

Xero only needs a date and an amount for each line, with money in as positive amounts and money out as negative amounts in the same column ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)). The Xero CSV from Tallyproof is laid out for this import. If Xero rejects a file, check the date format setting first; it is a common cause.

## Step 4: Avoid duplicates where the bank feed overlaps

This is the step that causes most of the clean-up work. Xero warns that duplicate statement lines can occur when a statement is imported manually and the same transactions also arrive through a bank feed ([Xero Central](https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK)).

Before you import, compare date ranges:

1. In Xero, open the bank account and find the date of the **earliest** transaction that came in through the bank feed.
2. Look at the date range of the statement you are importing.
3. If the statement runs past the start of the feed, you have an overlap. Either untick the overlapping lines at the review step in Step 3, or remove those rows from the CSV before importing.

Statement periods rarely line up neatly with feed start dates, so expect at least one statement that is partly covered. Watch for days where the feed started part-way through: some transactions on that date may be in the feed and others may not, so compare those lines one by one.

If duplicates do get in, Xero's Duplicate Statement Lines report helps you find them ([Xero Central](https://central.xero.com/0/article/Duplicate-Statement-Lines-report-New)).

## Step 5: Reconcile and check the balance

Imported lines appear on the account's reconciliation screen, just like feed transactions. Reconcile them as usual: match them to invoices and bills, or create spend and receive money transactions.

When you have finished a period, compare Xero's statement balance for the account with the closing balance printed on the last PDF statement. If they agree, the import is complete. If they don't, the usual causes are a statement that was missed, an overlap that was imported twice, or a flagged row that wasn't corrected.

## A note on accuracy

Any automatic conversion can misread a statement, which is why Tallyproof checks rows against the printed balances instead of asking you to trust it. Treat flagged rows as a to-do list, and keep the original PDFs with your records.

## Sources

- Parsefield, "PDF bank statement to Xero guide": https://parsefield.com/blog/pdf-bank-statement-to-xero-guide (PDF import limited to the US and Canada)
- Xero, "Connect your bank to Xero" (Australia): https://www.xero.com/au/accounting-software/connect-your-bank/ (history available when connecting a bank feed)
- Xero Central, "Import a bank statement in CSV format": https://central.xero.com/s/article/Import-a-CSV-bank-statement (import steps and CSV requirements)
- Xero Central, "Find and remove duplicate bank statement lines": https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK
- Xero Central, "Duplicate Statement Lines report": https://central.xero.com/0/article/Duplicate-Statement-Lines-report-New

Menu wording checked on 2 October 2026. Xero updates its interface regularly, so if a label has changed, Xero Central has the current steps.
