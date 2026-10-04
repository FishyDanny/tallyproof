---
title: "PDF bank statement to Excel converter"
description: "Convert a PDF bank statement to a CSV that opens cleanly in Excel or Google Sheets, checked row by row against the printed balances. Nothing is uploaded."
slug: bank-statement-to-excel
heading: "Convert PDF bank statements to Excel"
intro: "Turn a PDF bank or credit card statement into a spreadsheet-ready CSV file. Your statement is read in your browser and never uploaded, and every row is checked against the balances printed on it."
---

## Which format to choose

Choose **CSV (Excel, Google Sheets)** in the converter above. It's free, one statement at a time, with no account needed.

The CSV has a column for the date and description, separate money out and money in columns, a single signed amount column (negative for money out), the printed balance where the statement has one, and the result of the balance check for each row. The signed amount column is the one to use for totals and charts.

Before downloading, pick a date format. If you'll open the file on a computer set up for a different date order than the statement, or you're not sure, choose year-month-day (2026-04-03), which can't be confused between day-first and month-first.

## Opening the file in Excel

Double-clicking a CSV works, but Excel then applies its own default settings to every column ([Microsoft](https://support.microsoft.com/en-us/office/import-or-export-text-txt-or-csv-files-5250ac4c-663c-47ce-937b-339e391393ba)). That can swap days and months, strip leading zeros from references, and turn long numbers into scientific notation, with anything past 15 digits changed to zero ([Microsoft](https://support.microsoft.com/en-us/office/keeping-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7)).

For more control, use **Data > From Text/CSV** and set the type of any column that must stay exactly as written to Text. In Microsoft 365 and Excel 2024 you can also turn off these automatic conversions under **File > Options > Data** ([Microsoft](https://support.microsoft.com/en-us/excel/set-automatic-data-conversions)).

## Why not Excel's own PDF import?

Excel has **Data > Get Data > From PDF**, and if you have it, it's worth a try. But Microsoft lists the PDF connector for Excel on Windows only, not for Excel for Mac or Excel for the web ([Microsoft](https://support.microsoft.com/en-us/excel/power-query-data-sources-in-excel-versions)). Statements often come out as one table per page, and Microsoft notes that rows spread over several lines may need cleaning up by hand ([Microsoft Learn](https://learn.microsoft.com/en-us/power-query/connectors/pdf)). Nothing checks whether the amounts it extracted are right.

## How the check works

Tallyproof tests every transaction against the running balance printed on the statement: the previous balance plus the amount should equal the printed balance. Rows that don't match are highlighted, so you can compare them with the PDF before you rely on the spreadsheet. Statements without a running balance, such as most credit card statements, are checked as a whole: opening balance plus all transactions should equal the closing balance.

Once the file is in Excel, a quick `=SUM()` of the signed amount column should equal the closing balance minus the opening balance.

## Limits to know about

<!-- if prices -->

- **Text PDFs only.** If you can't select words in the PDF, it's a scan and can't be read.
- **Amounts need two decimal places,** such as 45.00.
- **One statement at a time on the free version.** Pro (US$9 a month or US$69 a year) and the Catch-up Pass (US$19 one-off, 30 days of Pro) convert many statements at once and merge them into one file, with rows repeated across overlapping statements removed. That's handy for a full year in one spreadsheet.

<!-- else -->

- **Text PDFs only.** If you can't select words in the PDF, it's a scan and can't be read.
- **Amounts need two decimal places,** such as 45.00.
- **One statement at a time for now.** Converting many statements at once and merging them into one file are not available yet. They are planned for a paid plan later, and we'll announce the price before anything is charged.

<!-- endif -->

## Step-by-step guides

- [Bank statement PDF to Excel: what works and what to watch for](/guides/bank-statement-pdf-to-excel/)
- [How to convert a PDF bank statement to CSV](/guides/convert-bank-statement-pdf-to-csv/)
- [How to check a converted bank statement is accurate](/guides/check-converted-bank-statement-is-accurate/)

## Sources

- Microsoft Support, "Import or export text (.txt or .csv) files": https://support.microsoft.com/en-us/office/import-or-export-text-txt-or-csv-files-5250ac4c-663c-47ce-937b-339e391393ba
- Microsoft Support, "Keeping leading zeros and large numbers": https://support.microsoft.com/en-us/office/keeping-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7
- Microsoft Support, "Set automatic data conversions": https://support.microsoft.com/en-us/excel/set-automatic-data-conversions
- Microsoft Support, "Power Query data sources in Excel versions": https://support.microsoft.com/en-us/excel/power-query-data-sources-in-excel-versions
- Microsoft Learn, "Power Query PDF connector": https://learn.microsoft.com/en-us/power-query/connectors/pdf

Checked on 2 October 2026.
