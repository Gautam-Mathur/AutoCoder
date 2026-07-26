Attribute VB_Name = "DuplicateHighlighter"

Sub HighlightDuplicatesInColumnA()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim count As Long
    Dim cellValue As Variant
    
    ' Set the active worksheet
    Set ws = ActiveSheet
    
    ' Find the last row with data in Column A
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    
    ' Clear any existing highlights
    ws.Range("A1:A" & lastRow).Interior.ColorIndex = xlNone
    
    ' Loop through each cell in Column A
    For i = 1 To lastRow
        cellValue = ws.Cells(i, 1).Value
        
        ' Count how many times this value appears in Column A
        count = Application.WorksheetFunction.CountIf(ws.Range("A1:A" & lastRow), cellValue)
        
        ' If the value appears more than once, highlight it
        If count > 1 Then
            ws.Cells(i, 1).Interior.Color = RGB(255, 255, 0) ' Yellow highlight
        End If
    Next i
    
    MsgBox "Duplicate highlighting complete!"
End Sub

Sub CountDuplicatesInColumnA()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim count As Long
    Dim cellValue As Variant
    Dim duplicateCount As Long
    Dim uniqueCount As Long
    
    ' Set the active worksheet
    Set ws = ActiveSheet
    
    ' Find the last row with data in Column A
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    
    duplicateCount = 0
    uniqueCount = 0
    
    ' Loop through each cell in Column A
    For i = 1 To lastRow
        cellValue = ws.Cells(i, 1).Value
        
        ' Count how many times this value appears in Column A
        count = Application.WorksheetFunction.CountIf(ws.Range("A1:A" & lastRow), cellValue)
        
        ' If the value appears more than once, increment duplicate counter
        If count > 1 Then
            duplicateCount = duplicateCount + 1
        Else
            uniqueCount = uniqueCount + 1
        End If
    Next i
    
    ' Display results in a message box
    MsgBox "Duplicate Count: " & duplicateCount & vbCrLf & "Unique Count: " & uniqueCount
End Sub

Sub HighlightAndCountDuplicates()
    Call HighlightDuplicatesInColumnA
    Call CountDuplicatesInColumnA
End Sub