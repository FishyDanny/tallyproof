---
title: "How to check a converted bank statement is accurate"
description: "Checks that prove a PDF-to-CSV conversion is complete: running balance, opening and closing totals, row counts, and the extraction errors to look for."
slug: check-converted-bank-statement-is-accurate
---

Whatever you use to turn a PDF bank statement into a spreadsheet or CSV file, the result deserves checking before it goes into your books. A conversion can look perfect and still be missing one row or have one amount pointing the wrong way, and you'll only find out when a reconciliation refuses to balance months later.

The good news is that a bank statement contains everything you need to check it. These checks work on any conversion, whether it came from a converter, Excel, copy and paste, or someone typing it in.

## Check 1: The running balance, row by row

Most bank statements print a balance after each transaction. That gives you a test for every single row:

> previous balance + this row's amount = this row's printed balance

(with money in as a positive amount and money out as negative). If the conversion includes the balance column, you can test it in a spreadsheet. With the signed amount in column C and the printed balance in column D, put this in E3 and copy it down:

`=ROUND(D2 + C3 - D3, 2)`

Every row should show 0. The first non-zero row tells you exactly where something went wrong. The `ROUND` stops tiny floating-point leftovers from showing up as false alarms.

This is the strongest check there is, because each row is proven against the bank's own figures. It's what Tallyproof does automatically for every row of a statement with a running balance, highlighting any row that doesn't match.

One thing to watch: if transactions are listed newest first, work from the bottom up, or sort by date first.

## Check 2: Opening balance plus transactions equals closing balance

Some statements, including most credit card statements, don't print a balance on each line. You can still check the statement as a whole:

> opening balance + sum of all transactions = closing balance

In a spreadsheet: `=ROUND(opening + SUM(C:C) - closing, 2)` should be 0.

Many statements also print totals of money in and money out (or of payments and purchases). Compare those with `SUMIF(C:C,">0")` and `SUMIF(C:C,"<0")`. If the overall total is out, these tell you which side the problem is on.

The limit of this check is that it can't point at the faulty row. If it fails, use the clues in the next section to narrow it down.

## Check 3: Count the rows on each page

Count the transactions on each page of the PDF and compare with the rows in your file for the same date range. It's tedious on a long statement, but it catches things the totals can't: two errors that happen to cancel out, or a duplicated pair of rows that sum to zero.

You don't need to do this for every page of every statement. Do it whenever a balance check fails, and spot-check page boundaries on the first statement from a new layout.

## Check 4: Dates and descriptions

The balance checks prove amounts, not dates or descriptions. Look at:

- **The first and last dates.** They should match the statement period.
- **A date after the 12th of a month.** A date like 25/04 can only be read one way, so if it appears correctly, day and month haven't been swapped. If you see the 4th of the 25th month, or a run of dates in the wrong month, the day and month order is wrong.
- **A few descriptions** against the PDF, especially long ones.

## Common extraction errors and how to spot them

A PDF doesn't store a table; it stores pieces of text and where to draw them. Any tool that extracts transactions has to rebuild the rows and columns, and these are the places it most often goes wrong.

**Wrapped descriptions.** A long description that runs onto a second line can become its own row with no amount, or be attached to the next transaction instead. Look for rows with a description but no amount, and for descriptions that don't match their amounts. A wrapped line on its own usually doesn't break the balance check, because it has no amount, so Check 4 matters here.

**CR and DR signs.** Statements mark direction in different ways: separate money in and money out columns, a minus sign, brackets, or "CR" and "DR" after the amount. If a credit is read as a debit, the balance check fails at that row by exactly twice the amount. Remember that the labels can be confusing: on a bank account, a "credit" is money in, because from the bank's point of view your deposit is money it owes you ([Wikipedia](https://en.wikipedia.org/wiki/Debits_and_credits)). On a credit card statement, "CR" usually marks a payment or refund.

**Missing rows at page breaks.** The last row on a page or the first row on the next is the most likely to be dropped, particularly when a page ends with a subtotal. The balance check fails on the next row by exactly the missing amount.

**Carried-forward lines picked up as transactions.** Lines such as "Balance brought forward" or "Opening balance" at the top of each page are not transactions. If one is read as a transaction, the difference equals that balance.

**Duplicated rows.** Overlapping statements, or a page processed twice, give you the same transaction twice. The totals will be out by that amount. Two identical purchases on the same day can be genuine, so check the PDF before deleting.

**Foreign currency columns.** On lines with an overseas purchase, the foreign amount can be taken instead of the converted amount. The difference is usually an odd-looking number.

**Hand-typed figures.** If any rows were typed in by hand, look for swapped digits. A transposition error, such as 54.30 typed as 45.30, produces a difference that divides evenly by 9 ([AccountingCoach](https://www.accountingcoach.com/blog/what-is-a-transposition-error)).

## Use the size of the difference

When a check fails, the difference itself is your best clue:

| Difference | Likely cause |
|---|---|
| Exactly one transaction's amount | Missing row, or an extra row |
| Twice one transaction's amount | Wrong sign (credit read as debit, or the reverse) |
| Equal to a balance figure | A brought-forward line read as a transaction |
| Divides evenly by 9 | Swapped digits in a typed figure |

## After importing: reconcile

The final check happens in your accounting software. Reconcile the account using the closing balance printed on the statement. If the software agrees with the statement, nothing was lost on the way in. If it doesn't, and the conversion passed its checks, look at the import instead: a statement imported twice, an overlap with the bank feed, or rows left unticked on the import screen. See [catch-up bookkeeping from old bank statements](/guides/catch-up-bookkeeping-old-bank-statements/) for how to avoid overlaps.

## Where Tallyproof fits

[Tallyproof](https://tallyproof.pages.dev) runs Checks 1 and 2 for you as part of every conversion, in your browser, without uploading the statement. Rows that don't match the printed balance are highlighted so you know where to look, and the checks run again if you change how a column is read. Checks 3 and 4 still need your eyes, especially for a layout you haven't converted before.

Tallyproof needs a text-based PDF and amounts printed with two decimal places. Scanned statements aren't supported.

## Sources

- Wikipedia, "Debits and credits": https://en.wikipedia.org/wiki/Debits_and_credits (why bank statements show deposits as credits)
- AccountingCoach, "What is a transposition error?": https://www.accountingcoach.com/blog/what-is-a-transposition-error (differences divisible by 9)

Checked on 2 October 2026.
