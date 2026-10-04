---
title: "Catch-up bookkeeping: how to backfill months of old bank statements"
description: "A practical order of work for catching up months or years of bookkeeping from PDF bank statements, without overlapping your bank feed or losing track."
slug: catch-up-bookkeeping-old-bank-statements
---

Catch-up bookkeeping usually starts the same way. The bank feed in Xero, QuickBooks Online or MYOB covers the recent past, but there's a gap before it: months or years of transactions that only exist as PDF statements. Maybe you're a sole trader who has fallen behind, a business moving to new software, or a bookkeeper taking on a client whose records stopped some time ago.

The work itself isn't complicated. What makes it slow is losing track: a missing statement, a month imported twice, or a period that overlaps the bank feed. This guide sets out an order of work that avoids those.

## Step 1: Map the gap for every account

Before downloading anything, list every account that needs catching up: each bank account, each credit card, and any loan or merchant account the business uses. For each one, write down:

- **The last date that's already reconciled** in your accounting software, if any.
- **The date the bank feed starts**, meaning the earliest transaction that came in through the feed. Feeds don't all reach back the same distance; see [why bank feeds only go back so far](/guides/import-historical-transactions-bank-feed-limit/).
- **The period you need to fill** between those two dates.

A simple table with one row for each account and one column for each month, ticked off as you go, is worth the five minutes it takes. It's the easiest way to notice a missing statement before it turns into a reconciliation that won't balance.

## Step 2: Check what your software will accept

Accounting software can refuse transactions before certain dates. MYOB, for example, won't import statement transactions dated before the opening balance date (MYOB Business) or conversion month (AccountRight), or before a lock date ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)). If you're backfilling a long period, check these settings in your software now rather than discovering them halfway through.

Also check the opening balance of each account in the software matches the opening balance on the first statement you're about to import. If they differ, every reconciliation after that will be out by the same amount.

## Step 3: Get the statements

Download the PDF statements for each account and period from online banking. How far back you can download varies by bank; for older periods, ask the bank for copies. Before converting, open one and try to select a word. If the text highlights, it's a text PDF and can be converted. If it behaves like a picture, it's a scan, and Tallyproof can't read it.

If your bank offers CSV or OFX downloads for the period you need, use those: they come straight from the bank. PDF conversion is for when the PDF is all you have.

## Step 4: Convert in batches, one account at a time

Work through one account at a time, in date order. Mixing accounts is the fastest way to import a statement into the wrong one.

Within an account, batch the statements into chunks your software can take in one go, and that you can reconcile in one sitting:

- **QuickBooks Online** limits each upload to 1,000 lines and 350 KB ([Intuit](https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU)), so a busy account may need several uploads a year.
- **Xero** won't import a CSV with more than 100,000 rows ([Xero Central](https://central.xero.com/s/article/Import-a-CSV-bank-statement)), so file size is rarely the issue; reconciling in sensible chunks is.
- **MYOB** limits statement files to 10 MB, and suggests that when importing several months, you import and reconcile one month at a time ([MYOB](https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements)).

<!-- if prices -->

Converting one statement at a time with [Tallyproof](https://tallyproof.pages.dev) is free, and for a handful of statements that's all you need. For a backlog, Pro or the Catch-up Pass lets you add many statements at once and merge them into one file in date order. When two statements overlap (for example, a monthly statement and a quarterly one covering the same weeks), rows that appear in both are removed from the merged file so they aren't counted twice.

<!-- else -->

Converting one statement at a time with [Tallyproof](https://tallyproof.pages.dev) is free, and for a handful of statements that's all you need. For a backlog, work through the statements one at a time and reconcile each period before the next (Step 6). Converting many statements at once and merging them into one file are not available yet. They are planned for a paid plan later, and we'll announce the price before anything is charged.

<!-- endif -->

<!-- if prices -->

That de-duplication only compares the statements you're converting with each other. It doesn't know what's already in Xero, QuickBooks Online or MYOB, so it won't stop an overlap with your bank feed. That's Step 5.

<!-- else -->

Tallyproof doesn't know what's already in Xero, QuickBooks Online or MYOB, so it won't stop an overlap with your bank feed. That's Step 5.

<!-- endif -->

Before exporting each batch, look at the verification. Every row is checked against the running balance printed on the statement, and rows that don't add up are highlighted. Statements with no running balance, as on most credit cards, are checked as a whole: opening balance plus transactions should equal the closing balance. Clear up every flagged row against the PDF before you import, not after.

## Step 5: Stop at the bank feed

The most common catch-up mistake is importing transactions that the bank feed already brought in. Xero, for example, warns that duplicate statement lines can occur when the same transactions arrive through both a feed and a manual import ([Xero Central](https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK)).

For each account:

1. Find the date of the earliest transaction that came in through the feed.
2. Import only transactions dated before it. For the one statement that straddles that date, remove the rows from the feed start date onwards, or untick them on the import screen.
3. Look closely at the feed's first day. Some of that day's transactions may be in the feed and others may not, so compare them one by one.

If you're producing OFX files from PDFs, don't count on the software to catch overlaps. A converter has to generate its own transaction IDs, and they won't match the IDs in your bank feed.

## Step 6: Reconcile period by period

Import a batch, then reconcile it before importing the next. Use the closing balance printed on each statement as the statement balance in your software. If they agree, that period is done; tick it off in your table. If they don't, the usual causes are:

- a missing statement (check your table for gaps);
- a period imported twice, often around the bank feed start date;
- a flagged row that wasn't corrected;
- an opening balance in the software that doesn't match the first statement.

Finding a problem in one month is quick. Finding it after a year of imports is not.

<!-- if prices -->

## Free, Pro or the Catch-up Pass?

- **A few statements:** the free version, one statement at a time, is enough for Xero and QuickBooks Online.
- **A one-off backlog:** the Catch-up Pass (US$19, 30 days of Pro, doesn't renew) covers batch conversion, merging, and OFX and QIF export.
- **Regular work across many clients:** Pro, at US$9 a month or US$69 a year.
- **MYOB at any size:** MYOB needs OFX or QIF, which are Pro features, so you'll need Pro or the pass. See [importing bank statements into MYOB](/guides/import-bank-statements-into-myob/).

Whichever you use, the statements are read in your browser and never uploaded, which matters when the backlog belongs to a client.

<!-- else -->

## What the free version covers

- **A few statements:** the free version, one statement at a time, is enough for Xero and QuickBooks Online.
- **A large backlog:** convert one statement at a time and reconcile each period before the next. Converting many statements at once and merging them are not available yet.
- **MYOB at any size:** MYOB needs OFX or QIF, and Tallyproof's OFX and QIF exports are not available yet. See [importing bank statements into MYOB](/guides/import-bank-statements-into-myob/).

The statements are read in your browser and never uploaded, which matters when the backlog belongs to a client.

<!-- endif -->

## Sources

- MYOB, "Import bank and credit card statements": https://www.myob.com/au/support/myob-business/banking/bank-statements/import-bank-and-credit-card-statements (opening balance and lock dates, 10 MB limit, one month at a time)
- Intuit, "Manually upload transactions into QuickBooks Online" (Australia): https://quickbooks.intuit.com/learn-support/en-au/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_AU_en_AU (350 KB and 1,000-line limits)
- Xero Central, "Import a bank statement in CSV format": https://central.xero.com/s/article/Import-a-CSV-bank-statement (100,000-row limit)
- Xero Central, "Find and remove duplicate bank statement lines": https://central.xero.com/0/article/Find-and-remove-duplicate-bank-statement-lines-UK

Checked on 2 October 2026.
