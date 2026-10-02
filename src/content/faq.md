---
title: "Frequently asked questions"
description: "Answers about Tallyproof: privacy, which statements work, how balance checking works, export formats, Pro and the Catch-up Pass, and refunds."
---

## Is my bank statement uploaded anywhere?

No. Tallyproof reads your PDF inside your browser using pdf.js, and the extraction, checking and export all happen on your device. The file and its contents are never sent to Tallyproof or anyone else. You can check this yourself: open your browser's developer tools, select the Network tab, convert a statement, and you will see no request carrying your file. The source code is open source (AGPL-3.0), so anyone can read exactly what it does.

## How can I tell the conversion is correct?

Tallyproof checks every transaction against the running balance printed on the statement: the previous balance plus the transaction amount should equal the printed balance on that line. If a row was missed, misread or given the wrong sign, the numbers stop adding up and that row is flagged for you to check against the PDF. Rows that pass have amounts that agree with the bank's own printed balances.

The check covers amounts, not dates or descriptions, so give those a quick look as well.

## What if my statement doesn't show a running balance?

Many statements, including most credit card statements, don't print a balance on each line. For these, Tallyproof checks the whole statement instead: the opening balance plus all transactions should equal the closing balance. This tells you whether the statement as a whole adds up, but if it doesn't, it can't point to the specific row, so you'll need to compare the output with the PDF.

## Which banks does Tallyproof support?

There is no official list of supported banks yet. Instead of hand-written parsers for particular banks, Tallyproof detects the layout of each statement automatically, so it can work with statements from any bank as long as they are text-based PDFs. Because layouts vary, always review the verification results. If a statement doesn't convert properly, please let us know (see the last question).

## Does it work with scanned statements?

Not yet. Tallyproof needs a text-based PDF, the kind you download from online banking. A quick test: open the PDF and try to select a word. If the text highlights, it should work. If the page behaves like a picture, it is a scan and Tallyproof can't read it.

## What formats can I export?

Free: generic CSV, Xero CSV and QuickBooks Online CSV, one statement at a time.

Pro and the Catch-up Pass add OFX and QIF exports, plus converting many statements at once and merging them into one file.

## Can I import the result into Xero, QuickBooks Online or MYOB?

Xero and QuickBooks Online both accept CSV statement imports, and the free version produces CSV files laid out for each. MYOB imports bank statements as OFX or QIF files (not CSV), which are Pro features. Our guides walk through each one, including how to avoid duplicates where a bank feed overlaps.

## Is it really free?

Yes. Converting a single statement to CSV is free, with no account, no sign-up and no limits on how many times you use it. Pro is for people with a backlog of statements or who need OFX or QIF files.

## What's the difference between Pro and the Catch-up Pass?

They unlock the same features. Pro is a subscription at US$9 a month or US$69 a year, for people who convert statements regularly. The Catch-up Pass is a one-off US$19 payment for 30 days of Pro, for a single backfill job such as catching up on a year of bookkeeping. The pass doesn't renew.

## How do payments and licence keys work?

Payments are handled by Polar, which acts as the merchant of record and deals with billing and tax. After you buy, you receive a licence key. Enter it in Tallyproof to unlock Pro in your browser. When the key is checked, the request sent to Polar contains only the licence key and Tallyproof's organisation ID, never anything from your statements.

## Can I get a refund?

Yes. If you're not happy, ask within 14 days of your purchase for a full refund, no questions asked. Email SUPPORT_EMAIL and the refund will be processed through Polar.

## Do you use cookies or track me?

No. There are no accounts and no tracking cookies, and there is currently no analytics. If analytics is added later, it will be a privacy-friendly service that never sees the contents of your statements, and the privacy policy will be updated first.

## Who makes Tallyproof?

Tallyproof is built and run by an individual developer based in Australia. The code is open source on GitHub, so you don't have to take the privacy claims on trust.

## A statement didn't convert properly. What should I do?

Please tell us, but don't send the statement itself. Open an issue on GitHub (GITHUB_REPO_URL) or email SUPPORT_EMAIL with the bank's name and a description of the layout, with personal details removed: for example, which columns appear, how dates and amounts are written, and what went wrong. That is usually enough to reproduce and fix the problem.
