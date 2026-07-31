# Create directories
$dest = Join-Path $PSScriptRoot "fixtures"
if (!(Test-Path $dest)) { New-Item -Path $dest -ItemType Directory -Force }

try {
    # Generate Word Document -> PDF (17 = wdFormatPDF)
    $Word = New-Object -ComObject Word.Application
    $Word.Visible = $false
    
    # Musterlösung
    $Doc = $Word.Documents.Add()
    $Doc.Content.Text = "Hintergrund: Ein Schüler hat eine Arbeit zum Thema 'Die Antwort auf Alles' geschrieben. 
Aufgabe 1: Benenne die Zahl der Zahlen. (5 Punkte)
Lösung: 42.

Aufgabe 2: Erkläre den Sinn. (10 Punkte)
Lösung: Es gibt keinen, außer Korrigieren."
    $Doc.SaveAs([ref] "$dest\musterloesung.pdf", [ref] 17)
    $Doc.Close()
    
    # Schülerlösung
    $Doc = $Word.Documents.Add()
    $Doc.Content.Text = "Name: Andreas Heid
Klasse: 10a
Datum: 30.03.2026

Aufgabe 1:
Die Antwort ist 42.

Aufgabe 2:
Der Sinn ist das Programmieren von E2E Tests gegen Produktion."
    $Doc.SaveAs([ref] "$dest\schuelerloesung.pdf", [ref] 17)
    $Doc.Close()
    $Word.Quit()

    # Generate Excel
    $Excel = New-Object -ComObject Excel.Application
    $Excel.Visible = $false
    $Workbook = $Excel.Workbooks.Add()
    $Sheet = $Workbook.Worksheets.Item(1)
    $Sheet.Cells.Item(1,1) = "Vorname"
    $Sheet.Cells.Item(1,2) = "Nachname"
    $Sheet.Cells.Item(1,3) = "Email"
    $Sheet.Cells.Item(2,1) = "Andreas"
    $Sheet.Cells.Item(2,2) = "Heid"
    $Sheet.Cells.Item(2,3) = "andreas@example.com"
    $Sheet.Cells.Item(3,1) = "Test"
    $Sheet.Cells.Item(3,2) = "User"
    $Sheet.Cells.Item(3,3) = "test@example.com"

    $Workbook.SaveAs("$dest\schuelerliste.xlsx")
    $Workbook.Close()
    $Excel.Quit()
    
    Write-Host "Success: Assets created in $dest"
} catch {
    Write-Error $_
    if ($Word) { $Word.Quit() }
    if ($Excel) { $Excel.Quit() }
}
