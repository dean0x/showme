/**
 * Static JavaScript for file viewer - no dynamic generation
 * Clean separation between data and behavior
 */
(function() {
    'use strict';

    // Get data passed safely from template
    let fileData = {};
    try {
        const dataScript = document.getElementById('file-data');
        if (dataScript) {
            fileData = JSON.parse(dataScript.textContent);
        }
    } catch (e) {
        console.warn('Failed to parse file data:', e);
    }

    document.addEventListener('DOMContentLoaded', function() {
        initializeFileViewer();
    });

    function initializeFileViewer() {
        setupCopyButton();
        setupLineNumbers();
        setupSearch();
        handleLineHighlight();
    }

    function setupCopyButton() {
        const copyButton = document.querySelector('.copy-button');
        if (!copyButton) return;

        copyButton.addEventListener('click', async function() {
            try {
                // Get content from DOM - safe approach
                const content = fileData.rawContent || 
                               document.querySelector('pre code')?.textContent || 
                               document.querySelector('pre')?.textContent || '';

                await navigator.clipboard.writeText(content);
                
                // Visual feedback
                copyButton.innerHTML = '✅ Copied!';
                copyButton.classList.add('copy-success');
                
                setTimeout(() => {
                    copyButton.innerHTML = '📋 Copy';
                    copyButton.classList.remove('copy-success');
                }, 2000);

            } catch (error) {
                console.warn('Copy failed:', error);
                copyButton.innerHTML = '❌ Failed';
                setTimeout(() => {
                    copyButton.innerHTML = '📋 Copy';
                }, 2000);
            }
        });
    }

    function setupLineNumbers() {
        const codeBlock = document.querySelector('.code-with-lines');
        if (!codeBlock) return;

        // Add line numbers dynamically without breaking syntax highlighting
        const code = codeBlock.querySelector('code');
        if (!code) return;

        // Count lines in the highlighted content
        const lines = code.innerHTML.split('\n').length;
        
        // Create line numbers container
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'line-numbers';
        lineNumbers.setAttribute('aria-hidden', 'true');
        
        for (let i = 1; i <= lines; i++) {
            const lineNumber = document.createElement('div');
            lineNumber.className = 'line-number';
            lineNumber.textContent = i.toString();
            
            // Make line numbers clickable for file:line references
            lineNumber.addEventListener('click', function() {
                const reference = `${fileData.filepath}:${i}`;
                navigator.clipboard.writeText(reference).then(() => {
                    showTooltip(lineNumber, 'Copied: ' + reference);
                }).catch(() => {
                    showTooltip(lineNumber, 'Copy failed');
                });
            });
            
            lineNumbers.appendChild(lineNumber);
        }
        
        // Insert line numbers before the code
        codeBlock.insertBefore(lineNumbers, code);
        codeBlock.classList.add('has-line-numbers');
    }

    function setupSearch() {
        const searchOverlay = document.querySelector('.search-overlay');
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.querySelector('.search-results-info');
        const prevButton = document.querySelector('.search-prev');
        const nextButton = document.querySelector('.search-next');
        const closeButton = document.querySelector('.search-close');

        if (!searchOverlay || !searchInput) return;

        let currentMatches = [];
        let currentMatchIndex = -1;

        // Open search with Ctrl+F
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                openSearch();
            } else if (e.key === 'Escape') {
                closeSearch();
            }
        });

        function openSearch() {
            searchOverlay.style.display = 'block';
            searchInput.focus();
        }

        function closeSearch() {
            searchOverlay.style.display = 'none';
            clearHighlights();
            currentMatches = [];
            currentMatchIndex = -1;
        }

        // Search functionality
        searchInput.addEventListener('input', function() {
            const query = searchInput.value.trim();
            if (query.length === 0) {
                clearHighlights();
                searchResults.textContent = '';
                return;
            }
            performSearch(query);
        });

        function performSearch(query) {
            const codeElement = document.querySelector('pre code');
            if (!codeElement) return;

            clearHighlights();
            
            const originalText = codeElement.textContent;
            const regex = new RegExp(escapeRegExp(query), 'gi');
            const matches = [...originalText.matchAll(regex)];
            
            if (matches.length === 0) {
                searchResults.textContent = 'No matches';
                return;
            }

            // Highlight matches in the HTML
            let highlightedHTML = codeElement.innerHTML;
            const sortedMatches = matches.map((match, index) => ({
                ...match,
                originalIndex: index
            })).sort((a, b) => b.index - a.index); // Reverse order for replacement

            sortedMatches.forEach((match, index) => {
                const beforeMatch = highlightedHTML.substring(0, match.index);
                const matchText = highlightedHTML.substring(match.index, match.index + match[0].length);
                const afterMatch = highlightedHTML.substring(match.index + match[0].length);
                
                const className = index === 0 ? 'search-highlight search-current' : 'search-highlight';
                highlightedHTML = beforeMatch + 
                    `<span class="${className}">${matchText}</span>` + 
                    afterMatch;
            });

            codeElement.innerHTML = highlightedHTML;
            
            currentMatches = document.querySelectorAll('.search-highlight');
            currentMatchIndex = 0;
            
            searchResults.textContent = `${matches.length} matches`;
            
            if (currentMatches.length > 0) {
                scrollToMatch(currentMatches[0]);
            }
        }

        // Navigation
        prevButton?.addEventListener('click', () => navigateMatch(-1));
        nextButton?.addEventListener('click', () => navigateMatch(1));
        closeButton?.addEventListener('click', closeSearch);

        function navigateMatch(direction) {
            if (currentMatches.length === 0) return;
            
            // Remove current highlight
            if (currentMatchIndex >= 0) {
                currentMatches[currentMatchIndex].classList.remove('search-current');
            }
            
            // Update index
            currentMatchIndex += direction;
            if (currentMatchIndex >= currentMatches.length) {
                currentMatchIndex = 0;
            } else if (currentMatchIndex < 0) {
                currentMatchIndex = currentMatches.length - 1;
            }
            
            // Add new highlight
            currentMatches[currentMatchIndex].classList.add('search-current');
            scrollToMatch(currentMatches[currentMatchIndex]);
        }

        function scrollToMatch(element) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }

        function clearHighlights() {
            const highlights = document.querySelectorAll('.search-highlight');
            highlights.forEach(highlight => {
                const parent = highlight.parentNode;
                parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
                parent.normalize();
            });
        }

        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
    }

    function handleLineHighlight() {
        if (!fileData.lineHighlight || fileData.lineHighlight <= 0) return;

        // Highlight specific line
        const lineNumbers = document.querySelectorAll('.line-number');
        if (lineNumbers[fileData.lineHighlight - 1]) {
            lineNumbers[fileData.lineHighlight - 1].classList.add('highlighted');
            
            // Scroll to highlighted line
            setTimeout(() => {
                lineNumbers[fileData.lineHighlight - 1].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 100);
        }
    }

    function showTooltip(element, message) {
        // Simple tooltip implementation
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
        
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 2000);
    }
})();