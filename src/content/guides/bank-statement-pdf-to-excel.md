---
title: "Bank statement PDF to Excel: what works and what to watch for"
description: "Get a PDF bank statement into Excel without broken dates, lost zeros or wrong totals: Get Data from PDF, opening CSV files properly, and checking totals."
slug: bank-statement-pdf-to-excel
---

Excel is where a lot of statement work ends up: sorting expenses for a tax return, building a cash flow, or tidying transactions before they go to a bookkeeper. Getting a PDF statement into a spreadsheet is the easy part. Getting it in without Excel quietly changing dates, numbers and reference codes takes a little more care.

This guide covers Excel's built-in PDF import, the CSV route, and the formatting problems that catch people out.

## Option 1: Excel's Get Data from PDF

Excel can read tables from a PDF through Power Query: **Data > Get Data > From File > From PDF**. It shows the tables it has detected on each page, and you load the ones you want into a sheet.

It's worth trying if you have it, and the file never leaves your computer. But know its limits:

- **It isn't in every version of Excel.** Microsoft's list of Power Query data sources shows the PDF connector for Excel on Windows (it needs .NET Framework 4.5 or later) and doesn't list it for Excel for Mac or Excel for the web ([Microsoft](https://support.microsoft.com/en-us/excel/power-query-data-sources-in-excel-versions)). Microsoft's Q&A forum has threads from Mac users with Microsoft 365 who can't find the option ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5396350/import-data-from-a-pdf-file-into-excel-for-mac)).
- **Tables often come out page by page.** A twelve-page statement can arrive as a dozen separate tables, each with its own headers, which you then need to combine.
- **Multi-line rows need cleaning up.** Microsoft's own documentation for the connector says that where multi-line rows aren't identified properly, you may need to clean the data up yourself ([Microsoft Learn](https://learn.microsoft.com/en-us/power-query/connectors/pdf)). On a bank statement, that means descriptions that wrap onto a second line.
- **Nothing checks the numbers.** If a row is missed or a credit lands in the debit column, you won't be told.
- **Scanned PDFs don't work,** since there's no text to read.

## Option 2: Convert to CSV, then bring it into Excel

The other route is to convert the statement to a CSV file first, then open that in Excel. With [Tallyproof](https://tallyproof.pages.dev), the PDF is read in your browser and not uploaded, every row is checked against the running balance printed on the statement, and rows that don't add up are highlighted before you download anything. Choose **CSV (Excel, Google Sheets)** as the format. One statement at a time is free.

Then comes the part that trips people up: how you open the CSV.

## Don't just double-click the CSV

When you open a .csv file directly, Excel uses its current default settings to decide what each column is ([Microsoft](https://support.microsoft.com/en-us/office/import-or-export-text-txt-or-csv-files-5250ac4c-663c-47ce-937b-339e391393ba)). For bank transactions those guesses can be wrong in ways that are easy to miss.

The safer way is **Data > From Text/CSV**. You get a preview, and you can set each column's type before the data lands in the sheet. For a column that must stay exactly as written, such as a reference number, set the type to Text in the Power Query editor ([Microsoft](https://support.microsoft.com/en-us/office/keeping-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7)).

## Date pitfalls

Dates are the most common problem.

- **Day and month swapped.** A date written 03/04/2026 is 3 April in Australia and 4 March in the US. Microsoft gives this kind of mix-up as an example of what can happen when Excel applies its default settings to a CSV. A statement in one order opened on a computer set up for the other can give wrong dates for the first twelve days of every month.
- **Half-converted columns.** Dates such as 25/04/2026 can't be read month-first, so on a computer set up that way they can stay as text while 03/04/2026 becomes a (wrong) date. You end up with a column that is part dates, part text, and sorts strangely.
- **How to check.** Sort by date and look for rows out of place, or use `=ISNUMBER(A2)` down the date column: real dates return TRUE and text returns FALSE.

The cleanest fix is to export dates in a form Excel can't misread. Tallyproof lets you choose the date format before downloading, including year-month-day (2026-04-03), which can't be confused between day-first and month-first.

## Number pitfalls

- **Amounts stored as text.** If an amount arrives as text (for example because it still has "CR" or "DR" on the end, or a stray space), `SUM` skips it without warning. Use `=ISNUMBER()` on the amount column too, and make sure the total matches what you expect.
- **One column or two.** Statements usually have separate money in and money out columns. For totals and charts, a single signed amount column (money out negative) is easier. Tallyproof's generic CSV includes both.
- **Long numbers.** Excel keeps 15 significant digits. Longer numbers, such as a card number or a long reference, have the digits after the 15th changed to zero, and large numbers are shown in scientific notation ([Microsoft](https://support.microsoft.com/en-us/office/keeping-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7)).

## Leading zeros

Excel strips leading zeros from anything that looks like a number, so a reference like 000123 becomes 123 ([Microsoft](https://support.microsoft.com/en-us/office/keeping-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7)). That matters for cheque numbers, invoice references and account numbers in descriptions.

In Microsoft 365 and Excel 2024, you can turn this off under **File > Options > Data > Automatic Data Conversion** (on a Mac, **Excel > Preferences > Edit**). The same settings control converting long numbers to scientific notation and turning strings of letters and numbers into dates ([Microsoft](https://support.microsoft.com/en-us/excel/set-automatic-data-conversions)). In older versions, import those columns as Text using From Text/CSV.

## Formulas hiding in descriptions

A CSV cell that begins with `=`, `+`, `-` or `@` can be treated by a spreadsheet as a formula rather than text. This is known as CSV or formula injection, and it's a security issue when a file contains text that came from someone else ([OWASP](https://owasp.org/www-community/attacks/CSV_Injection)). Bank descriptions often include text other people typed, such as a payment reference. If Excel shows a security warning about links or external content when you open a statement file, don't enable it. Check the cell first.

## Check the totals once it's in Excel

After importing, two quick formulas tell you whether anything was lost along the way:

1. `=SUM()` of the signed amount column should equal the closing balance minus the opening balance on the statement.
2. `=COUNT()` of the amount column should equal the number of transactions in the PDF. Count them page by page if you need to.

If both agree, and the dates pass the `ISNUMBER` test, the spreadsheet is a faithful copy. For more ways to test a conversion, see [how to check a converted bank statement is accurate](/guides/check-converted-bank-statement-is-accurate/). If you're heading to accounting software rather than a spreadsheet, see [the differences between CSV, OFX and QIF](/guides/csv-vs-ofx-vs-qif-bank-statement-formats/).

## Sources

- Microsoft Support, "Power Query data sources in Excel versions": https://support.microsoft.com/en-us/excel/power-query-data-sources-in-excel-versions
- Microsoft Learn, "Power Query PDF connector": https://learn.microsoft.com/en-us/power-query/connectors/pdf (multi-line rows, multi-page tables)
- Microsoft Q&A, "Import data from a PDF file into Excel for Mac": https://learn.microsoft.com/en-us/answers/questions/5396350/import-data-from-a-pdf-file-into-excel-for-mac
- Microsoft Support, "Import or export text (.txt or .csv) files": https://support.microsoft.com/en-us/office/import-or-export-text-txt-or-csv-files-5250ac4c-663c-47ce-937b-339e391393ba
- Microsoft Support, "Keeping leading zeros and large numbers": https://support.microsoft.com/en-us/office/keeping-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7
- Microsoft Support, "Set automatic data conversions": https://support.microsoft.com/en-us/excel/set-automatic-data-conversions
- OWASP, "CSV Injection": https://owasp.org/www-community/attacks/CSV_Injection

Checked on 2 October 2026.
