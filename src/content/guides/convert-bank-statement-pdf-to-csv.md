---
title: "How to convert a PDF bank statement to CSV (and check it's right)"
description: "Ways to turn a PDF bank statement into CSV: copy and paste, Excel, online converters and browser-only tools, the privacy trade-offs, and checking results."
slug: convert-bank-statement-pdf-to-csv
---

Bank statements arrive as PDFs because PDFs are good for printing and archiving. They are bad for almost everything else. If you want to import transactions into accounting software, sort them in a spreadsheet, or hand them to a bookkeeper, you need them as rows and columns: a CSV file.

This guide covers the main ways to do that, what each one costs you in time and privacy, and how to tell whether the result is correct.

## Why PDF statements are hard to use

A PDF doesn't store a table. It stores pieces of text and where to draw them on the page. What looks like a neat grid of dates, descriptions and amounts is, inside the file, a scattered set of text fragments with coordinates. Any tool that extracts a table has to rebuild it by guessing which fragments belong in the same row and column.

That is where things go wrong:

- **Descriptions that wrap** onto a second or third line can become separate rows, or be merged into the wrong transaction.
- **Debit and credit columns** can be confused when a column is mostly empty, so money out ends up as money in.
- **Page breaks** repeat headers, carry-forward balances and footers that can be picked up as transactions.
- **Number formats** vary: minus signs, trailing "CR" or "DR", brackets for negatives, and thousands separators.

A conversion that looks fine at a glance can still contain one swapped sign or one missed row, and that is enough to stop a reconciliation balancing.

Before you start, check that your PDF actually contains text. Open it and try to select a word. If you can't highlight anything, it's a scanned image and needs OCR (optical character recognition) software, not a text converter.

## Option 1: Copy and paste

For a short statement, you can select the transactions in your PDF viewer, copy them, and paste them into a spreadsheet.

- **Good for:** one page, occasionally.
- **Drawbacks:** columns often paste into a single cell, so you'll need to split them (in Excel, Data > Text to Columns). Wrapped descriptions and page breaks need fixing by hand. It's slow for more than a page or two, and easy to miss a row.

## Option 2: Excel's "Get Data from PDF"

Excel can import tables from a PDF through Power Query: **Data > Get Data > From File > From PDF**. It shows the tables it has found on each page and lets you load them into a sheet.

- **Good for:** people who already use Excel for Windows with a Microsoft 365 subscription, and statements with simple table layouts. Your file stays on your computer.
- **Drawbacks:** it isn't available in every version of Excel; Microsoft's Q&A forum has several threads from people who can't find it, including on Excel for Mac ([Microsoft Q&A](https://learn.microsoft.com/en-au/answers/questions/5729090/within-excel-option-from-pdf-isnt-available-under)). It often returns each page as a separate table, so multi-page statements need combining and cleaning. It doesn't check whether the numbers it extracted are correct.

## Option 3: Online converters that upload your file

There are many websites that convert bank statements: you upload the PDF, their server (sometimes using an AI model) extracts the transactions, and you download a CSV or Excel file.

- **Good for:** speed, and some handle scanned statements.
- **Drawbacks:** your statement is sent to someone else's computer. A bank statement contains your name, address, account number, balances, and a detailed record of who you pay and who pays you. Once it's uploaded, you're relying on that company's security, its retention policy, and any providers it passes the file to. If you're a bookkeeper, it's also your clients' data, which you may have obligations to protect. Many of these services also charge per page.

None of this means these services are careless; some are very clear about deleting files. But you can't verify what happens to a file after it leaves your device.

## Option 4: Browser-only converters

A browser-only converter does the extraction inside your web browser, using JavaScript. The website delivers the program to your browser; your PDF is opened and processed on your own device and is never sent back to a server.

- **Good for:** sensitive files, and anyone who wants the convenience of a web tool without uploading statements.
- **Drawbacks:** the work is done by your computer, so very large batches can take a little longer on an older machine. Like other text-based tools, they can't read scanned PDFs without OCR.

"Nothing is uploaded" is a claim you should be able to check. Two ways to do that: open your browser's developer tools, select the Network tab and convert a file (you should see no request carrying your PDF), or read the source code if it's published.

## How balance verification catches extraction errors

Whatever method you use, the key question is: did every transaction come through, with the right amount and the right sign?

Most bank statements already contain the answer. Each transaction line shows a running balance, and the maths is simple:

> previous balance + this transaction's amount = this line's printed balance

If you check that for every row, an extraction error shows up straight away. A missed row breaks the chain at the next line. A debit read as a credit gives a balance that's off by twice the amount. A misread digit gives a small, specific difference. You know exactly which row to look at.

Some statements, including most credit card statements, don't print a running balance. In that case you can still check the whole statement: the opening balance plus all transactions should equal the closing balance. That tells you whether something is wrong, though not which row.

Two limits are worth knowing. The balance check proves the amounts, not the dates or descriptions, so those still deserve a quick look. And a statement-level check can't point to the faulty row, so when it fails you'll need to compare against the PDF.

## Step by step with Tallyproof

Tallyproof is a browser-only converter built around the balance check. It's free for single statements, needs no account, and its security policy tells your browser to block connections to other sites.

1. **Download your statement** as a PDF from your online banking.
2. **Open [tallyproof.pages.dev](https://tallyproof.pages.dev)** and choose the PDF. It's read in your browser with pdf.js; the file isn't uploaded.
3. **Let it detect the layout.** Tallyproof works out where the transaction table is and which column is which. There's no fixed list of supported banks; it works with statements that are text PDFs.
4. **Review the verification.** Every row is checked against the printed running balance, and rows that don't match are flagged. If there's no running balance, the opening and closing balances are checked instead. Compare anything flagged with the PDF.
5. **Choose a format and download.** The free version exports a generic CSV, a Xero CSV or a QuickBooks Online CSV.

<!-- if prices -->

If you have a backlog to get through, Pro (US$9 a month or US$69 a year) or the one-off Catch-up Pass (US$19 for 30 days of Pro) lets you convert many statements at once, merge them into one file, and export OFX or QIF files for software that doesn't take CSV.

<!-- else -->

If you have a backlog to get through, work through the statements one at a time for now. Converting many statements at once, merging them into one file, and exporting OFX or QIF files for software that doesn't take CSV are not available yet. They are planned for a paid plan later, and we'll announce the price before anything is charged.

<!-- endif -->

Tallyproof can't read scanned (image-only) PDFs yet. If your statement is a scan, you'll need an OCR tool first.

## Which option should you use?

- **One page, once:** copy and paste is fine.
- **Excel for Windows user, simple layout:** try Get Data from PDF, then check the totals.
- **Scanned statements:** you'll need a tool with OCR, which today usually means one that uploads your file. Weigh that against how sensitive the statements are.
- **Text PDFs, and you'd rather not upload them:** use a browser-only converter, and whichever tool you choose, check the result against the statement's balances before you rely on it.

## Sources

- Microsoft Q&A, "Within Excel, option From PDF isn't available under Get Data > From File": https://learn.microsoft.com/en-au/answers/questions/5729090/within-excel-option-from-pdf-isnt-available-under
- Microsoft Support, "Import data from data sources (Power Query)": https://support.microsoft.com/en-us/office/import-data-from-data-sources-power-query-be4330b3-5356-486c-a168-b68e9e616f5a
