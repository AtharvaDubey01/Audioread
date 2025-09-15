document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fileInput');
    const dropText = document.getElementById('drop-text');
    const loadingIndicator = document.getElementById('loading-indicator');
    const themeToggle = document.getElementById('themeToggle');

    // Restore theme from localStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }

    // Event listener for clicking the drop zone
    dropZone.addEventListener('click', () => fileInput.click());

    // Event listeners for drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Event listener for file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Handle the selected file
    async function handleFile(file) {
        if (file && file.type === 'application/pdf') {
            dropText.textContent = `Processing ${file.name}...`;
            loadingIndicator.style.display = 'block';

            const fileURL = URL.createObjectURL(file);
            const loadingTask = pdfjsLib.getDocument(fileURL);
            
            try {
                const pdfDoc = await loadingTask.promise;
                const totalPages = pdfDoc.numPages;
                const pagesText = [];

                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const content = await page.getTextContent();
                    const textItems = content.items.map(item => ({
                        text: item.str,
                        x: item.transform[4],
                        y: item.transform[5],
                        width: item.width
                    }));
                    pagesText.push(processTextWithFormatting(textItems, page.view));
                }

                // Save to session storage and redirect
                sessionStorage.setItem('pdfTotalPages', totalPages);
                sessionStorage.setItem('pdfPagesText', JSON.stringify(pagesText));
                window.location.href = 'reader.html';

            } catch (error) {
                console.error("Error processing PDF:", error);
                dropText.textContent = 'Failed to process PDF. Please try again.';
                loadingIndicator.style.display = 'none';
            }
        } else {
            dropText.textContent = 'Invalid file type. Please upload a PDF.';
        }
    }

    // **MODIFIED: Process text items to fix word splitting**
    function processTextWithFormatting(textItems, pageView) {
        if (!textItems || textItems.length === 0) return '';
        
        // Sort items by y-position (top to bottom) then x-position (left to right)
        textItems.sort((a, b) => {
            const yDiff = Math.abs(a.y - b.y);
            if (yDiff < 5) { // Items on the same line (using a tolerance)
                return a.x - b.x;
            }
            return b.y - a.y; // Different lines
        });

        // Group sorted items into lines
        const lines = [];
        if (textItems.length > 0) {
            let currentLine = [textItems[0]];
            for (let i = 1; i < textItems.length; i++) {
                // If y-position is very similar, it's the same line
                if (Math.abs(textItems[i].y - textItems[i-1].y) < 5) {
                    currentLine.push(textItems[i]);
                } else {
                    lines.push(currentLine);
                    currentLine = [textItems[i]];
                }
            }
            lines.push(currentLine);
        }
        
        // Process each line to build the final HTML with correct spacing
        let html = '';
        lines.forEach(line => {
            if (line.length === 0) return;

            let lineText = '';
            // Loop through items in the line
            for (let i = 0; i < line.length; i++) {
                const currentItem = line[i];
                lineText += currentItem.text;

                // Check if a space is needed before the next item
                if (i < line.length - 1) {
                    const nextItem = line[i+1];
                    const currentItemEnd = currentItem.x + currentItem.width;
                    
                    // Calculate the gap between the end of the current item and the start of the next
                    const gap = nextItem.x - currentItemEnd;

                    // If the gap is larger than a small threshold, it's a new word, so add a space.
                    // A small or negative gap means they are part of the same word (e.g., "Ye" and "s").
                    if (gap > 2) { 
                        lineText += ' ';
                    }
                }
            }

            html += `<div class="pdf-line"><span class="line">${lineText.trim()}</span></div>`;
        });

        return html;
    }
    
    // Theme toggle
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        if (document.body.classList.contains('dark')) {
            themeToggle.querySelector('i').className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        } else {
            themeToggle.querySelector('i').className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        }
    });
});