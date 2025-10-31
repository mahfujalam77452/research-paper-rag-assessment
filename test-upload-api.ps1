# Test script for Paper Upload API (Windows PowerShell)

Write-Host "🧪 Testing Paper Upload API..." -ForegroundColor Blue
Write-Host ""

$API_URL = "http://localhost:3000/api/papers"

# Test 1: Upload a paper
Write-Host "1️⃣ Testing paper upload..." -ForegroundColor Cyan

$PDF_PATH = "sample_papers/paper1_machine_learning.pdf"

if (-Not (Test-Path $PDF_PATH)) {
    Write-Host "❌ PDF file not found: $PDF_PATH" -ForegroundColor Red
    Write-Host "Please place a PDF file at $PDF_PATH"
    exit 1
}

try {
    $uploadUrl = "$API_URL/upload"
    
    # Create form data
    $form = @{
        file = Get-Item -Path $PDF_PATH
    }
    
    Write-Host "Uploading PDF... (this may take 20-30 seconds)" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $uploadUrl -Method Post -Form $form
    
    Write-Host "✅ Upload successful" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
    $paperId = $response.data.paperId
    Write-Host ""
    Write-Host "Paper ID: $paperId" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Upload failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test 2: List all papers
Write-Host "2️⃣ Testing list papers..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method Get
    
    Write-Host "✅ List successful" -ForegroundColor Green
    Write-Host ""
    Write-Host "Total Papers: $($response.data.totalPapers)" -ForegroundColor Yellow
    $response.data.papers | Select-Object title, authors, year, totalPages | Format-Table
    
} catch {
    Write-Host "❌ List failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test 3: Get paper details
if ($paperId) {
    Write-Host "3️⃣ Testing get paper details..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/$paperId" -Method Get
        
        Write-Host "✅ Get details successful" -ForegroundColor Green
        Write-Host ""
        Write-Host "Paper Details:" -ForegroundColor Yellow
        $response.data | Select-Object title, authors, year, totalPages, @{Name='totalChunks';Expression={$_.stats.totalChunks}} | Format-List
        
    } catch {
        Write-Host "❌ Get details failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    
    # Test 4: Get paper stats
    Write-Host "4️⃣ Testing get paper stats..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/$paperId/stats" -Method Get
        
        Write-Host "✅ Get stats successful" -ForegroundColor Green
        Write-Host ""
        $response.data | Format-List
        
    } catch {
        Write-Host "❌ Get stats failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 API tests completed!" -ForegroundColor Green
Write-Host ""

if ($paperId) {
    Write-Host "Note: To delete the test paper, run:" -ForegroundColor Yellow
    Write-Host "Invoke-RestMethod -Uri '$API_URL/$paperId' -Method Delete" -ForegroundColor White
}