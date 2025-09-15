document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const pagesContainer = document.getElementById('pagesContainer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const themeToggle = document.getElementById('themeToggle');
    const speedBtn = document.getElementById('speedBtn');
    const speedControl = document.getElementById('speedControl');
    const speedOptions = document.querySelectorAll('.speed-option');

    // State Variables
    let currentPage = 1;
    let totalPages = 0;
    let pagesText = [];
    let isPlaying = false;
    let wordList = [];
    let wordIndex = 0;
    let currentSpeed = 1;
    let resizeTimer;

    // Load data from session storage
    function loadData() {
        totalPages = parseInt(sessionStorage.getItem('pdfTotalPages'), 10);
        const storedText = sessionStorage.getItem('pdfPagesText');

        if (!totalPages || !storedText) {
            pagesContainer.innerHTML = `<p>No document loaded. Please <a href="index.html">upload a PDF</a> first.</p>`;
            return false;
        }
        pagesText = JSON.parse(storedText);
        return true;
    }

    // **MODIFIED: Render pages dynamically based on screen width**
    function renderPages() {
        pagesContainer.innerHTML = "";
        
        // Determine how many pages to show
        const pagesToShow = window.innerWidth >= 1100 ? 2 : 1;
        
        // Apply a class to the container for styling
        pagesContainer.className = pagesToShow === 2 ? 'pages two-page-layout' : 'pages single-page-layout';

        for (let i = 0; i < pagesToShow; i++) {
            const pageNum = currentPage + i;
            if (pageNum > totalPages) break;

            const pageDiv = document.createElement("div");
            pageDiv.className = "page";
            
            const pageIndicator = document.createElement("div");
            pageIndicator.className = "page-number";
            pageIndicator.textContent = `Page ${pageNum} of ${totalPages}`;
            pageDiv.appendChild(pageIndicator);
            
            const contentDiv = document.createElement("div");
            contentDiv.className = "page-content";
            contentDiv.innerHTML = pagesText[pageNum - 1];
            pageDiv.appendChild(contentDiv);
            
            pagesContainer.appendChild(pageDiv);
        }
        
        prepareSpeech();
        addClickToReadListeners();
        updateNavButtons();
    }

    // Update navigation button states
    function updateNavButtons() {
        const pagesToShow = window.innerWidth >= 1100 ? 2 : 1;
        rewindBtn.disabled = currentPage <= 1;
        forwardBtn.disabled = (currentPage + pagesToShow -1) >= totalPages;
    }

    // **MODIFIED: Prepare speech for all visible pages**
    function prepareSpeech(startIndex = 0) {
        stopSpeaking();
        wordList = []; // Reset the word list
        const visiblePages = pagesContainer.querySelectorAll(".page-content");
        if (!visiblePages.length) return;

        // Collect lines from all visible pages
        visiblePages.forEach(page => {
            const lines = page.querySelectorAll(".line");
            wordList.push(...lines);
        });

        wordIndex = startIndex;
        clearHighlights();
    }

    function clearHighlights() {
        const highlighted = pagesContainer.querySelectorAll(".highlight");
        highlighted.forEach(span => span.classList.remove("highlight"));
    }

    function playPause() {
        if (isPlaying) {
            pauseSpeaking();
        } else {
            startSpeaking();
        }
    }

    function startSpeaking() {
        if (!wordList.length || wordIndex >= wordList.length) return;
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        speakNextLine();
    }

    function pauseSpeaking() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        window.speechSynthesis.cancel();
    }

    function stopSpeaking() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        window.speechSynthesis.cancel();
        clearHighlights();
    }

    function speakNextLine() {
        if (wordIndex >= wordList.length) {
            stopSpeaking();
            if (nextPage()) {
                setTimeout(startSpeaking, 200);
            }
            return;
        }

        clearHighlights();
        const lineSpan = wordList[wordIndex];
        lineSpan.classList.add("highlight");
        lineSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const utterance = new SpeechSynthesisUtterance(lineSpan.textContent);
        utterance.rate = currentSpeed;
        utterance.onend = () => {
            wordIndex++;
            if (isPlaying) {
                speakNextLine();
            }
        };
        window.speechSynthesis.speak(utterance);
    }
    
    // **MODIFIED: Page navigation accounts for layout**
    function prevPage() {
        const pagesToMove = window.innerWidth >= 1100 ? 2 : 1;
        if (currentPage > 1) {
            stopSpeaking();
            currentPage = Math.max(1, currentPage - pagesToMove);
            renderPages();
            return true;
        }
        return false;
    }

    function nextPage() {
        const pagesToMove = window.innerWidth >= 1100 ? 2 : 1;
        if (currentPage + pagesToMove <= totalPages) {
            stopSpeaking();
            currentPage += pagesToMove;
            renderPages();
            return true;
        }
        return false;
    }
    
    // Event Listeners
    playPauseBtn.addEventListener("click", playPause);
    rewindBtn.addEventListener("click", prevPage);
    forwardBtn.addEventListener("click", nextPage);

    speedBtn.addEventListener('click', () => {
        speedControl.style.display = speedControl.style.display === 'none' ? 'block' : 'none';
    });
    
    speedOptions.forEach(option => {
        option.addEventListener('click', function() {
            currentSpeed = parseFloat(this.getAttribute('data-speed'));
            speedOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            speedControl.style.display = 'none';
        });
    });

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

    function addClickToReadListeners() {
        const allLines = pagesContainer.querySelectorAll(".line");
        allLines.forEach((span, globalIndex) => {
            span.addEventListener("click", () => {
                stopSpeaking();
                prepareSpeech(globalIndex);
                startSpeaking();
            });
        });
    }

    // **NEW: Handle window resizing**
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (totalPages > 0) {
                 renderPages();
            }
        }, 250); // Debounce to avoid excessive re-rendering
    });

    // Initialization
    function init() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
            themeToggle.querySelector('i').className = 'fas fa-sun';
        }
        if (loadData()) {
            renderPages();
        }
    }

    init();
});