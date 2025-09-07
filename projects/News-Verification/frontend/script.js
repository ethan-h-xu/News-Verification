// Sample news data (this would come from your blockchain in a real implementation)
const sampleNewsData = [
    {
        id: 1,
        source: "User 1",
        content: "Studies have shown that AI 'offers the promise of greater efficiency' and I am so excited about it!"
    },
    {
        id: 2,
        source: "User 2",
        content: "WOW! OpenAI just said 'we expect all human jobs to be replaced by AI in 5 years'. I am so scared."
    },
    {
        id: 3,
        source: "User 3",
        content: "I just keep on talking and talking but I actually don't have a quote in my post so nothing will happened."
    }
];


// Source data loaded from JSON files
let sourceData = [];

// DOM elements
const newsFeed = document.getElementById('newsFeed');
const loading = document.getElementById('loading');

// Initialize the feed
document.addEventListener('DOMContentLoaded', async function() {
    await loadSourceData();
    loadNewsFeed();
});

// Load source data from JSON files
async function loadSourceData() {
    try {
        // Load source_1.json
        const response1 = await fetch('./sources/source_1.json');
        const source1 = await response1.json();
        
        // Load source_2.json
        const response2 = await fetch('./sources/source_2.json');
        const source2 = await response2.json();
        
        // Add both sources to sourceData array
        sourceData = [source1, source2];
        
        console.log('Source data loaded:', sourceData);
    } catch (error) {
        console.error('Error loading source data:', error);
        // Fallback to empty array if files can't be loaded
        sourceData = [];
    }
}

// Load and display news feed
function loadNewsFeed() {
    // Hide loading indicator
    loading.classList.add('hidden');
    
    // Clear existing feed
    newsFeed.innerHTML = '';
    
    // Add posts to feed
    sampleNewsData.forEach(post => {
        const postElement = createPostElement(post);
        newsFeed.appendChild(postElement);
    });
    
    // Add scroll animation
    animatePosts();
}

// Create a post element
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.innerHTML = `
        <div class="post-header">
            <span class="source-badge">${post.source}</span>
        </div>
        <div class="post-content clickable">${post.content}</div>
    `;
    
    // Add click event listener to post content
    const contentElement = postDiv.querySelector('.post-content');
    contentElement.addEventListener('click', function() {
        checkForQuotes(post.content);
    });
    
    return postDiv;
}

// Animate posts as they come into view
function animatePosts() {
    const posts = document.querySelectorAll('.post');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    posts.forEach(post => {
        observer.observe(post);
    });
}

// Simulate loading more posts (for infinite scroll)
function loadMorePosts() {
    // This would fetch more posts from your blockchain
    console.log('Loading more posts...');
}

// Add infinite scroll functionality
let isLoading = false;
window.addEventListener('scroll', function() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        if (!isLoading) {
            isLoading = true;
            loadMorePosts();
            setTimeout(() => {
                isLoading = false;
            }, 1000);
        }
    }
});

// Search functionality (placeholder)
function searchPosts(query) {
    const filteredPosts = sampleNewsData.filter(post => 
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.content.toLowerCase().includes(query.toLowerCase()) ||
        post.source.toLowerCase().includes(query.toLowerCase())
    );
    
    newsFeed.innerHTML = '';
    filteredPosts.forEach(post => {
        const postElement = createPostElement(post);
        newsFeed.appendChild(postElement);
    });
    
    animatePosts();
}

// Extract text within single quotes and check against sources
function checkForQuotes(postContent) {
    // Extract all text within single quotes
    const quoteRegex = /'([^']+)'/g;
    const quotes = [];
    let match;
    
    while ((match = quoteRegex.exec(postContent)) !== null) {
        quotes.push(match[1]);
    }
    
    if (quotes.length === 0) {
        showPopup("No Quotes Found", "This post doesn't contain any text in single quotes.", "info");
        return;
    }
    
    // Check each quote against source data
    const matches = [];
    quotes.forEach(quote => {
        sourceData.forEach(source => {
            if (source.content.includes(quote) && source.verified) {
                matches.push({
                    quote: quote,
                    source: source
                });
            }
        });
    });
    
    if (matches.length === 0) {
        showPopup("No Matches Found", "The quoted text doesn't match any verified sources.", "warning");
    } else {
        // Show popup with all matches
        showMatchesPopup(matches);
    }
}

// Show popup with matching sources
function showMatchesPopup(matches) {
    const uniqueSources = [...new Set(matches.map(m => m.source.title))];
    
    let popupContent = `
        <div class="popup-body">
            <p class="match-count">Found ${matches.length} quote${matches.length > 1 ? 's' : ''} in ${uniqueSources.length} verified source${uniqueSources.length > 1 ? 's' : ''}:</p>
    `;
    
    // Group matches by source
    const groupedMatches = {};
    matches.forEach(match => {
        if (!groupedMatches[match.source.title]) {
            groupedMatches[match.source.title] = {
                source: match.source,
                quotes: []
            };
        }
        groupedMatches[match.source.title].quotes.push(match.quote);
    });
    
    // Display each source
    Object.values(groupedMatches).forEach(group => {
        popupContent += `
            <div class="source-match">
                <h4>${group.source.title}</h4>
                <div class="source-info">
                    <span class="source-badge">${group.source.source}</span>
                    <span class="source-date">${group.source.created_date}</span>
                </div>
                <div class="quotes-found">
                    <strong>Quotes found:</strong>
                    <ul>
                        ${group.quotes.map(quote => `<li>"${quote}"</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    });
    
    popupContent += `
        </div>
        <div class="popup-footer">
            <button onclick="closePopup()" class="close-button">Close</button>
        </div>
    `;
    
    showPopup("Quote Verification Results", popupContent, "success");
}

// Generic popup function
function showPopup(title, content, type = "info") {
    // Remove existing popup if any
    const existingPopup = document.querySelector('.popup-overlay');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Create popup overlay
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'popup-overlay';
    
    const popupHtml = `
        <div class="popup ${type}">
            <div class="popup-header">
                <h3>${title}</h3>
                <span class="close-btn" onclick="closePopup()">&times;</span>
            </div>
            <div class="popup-body">
                ${content}
            </div>
        </div>
    `;
    
    popupOverlay.innerHTML = popupHtml;
    document.body.appendChild(popupOverlay);
    
    // Close on overlay click
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

// Close popup function
function closePopup() {
    const popup = document.querySelector('.popup-overlay');
    if (popup) {
        popup.remove();
    }
}

// Export functions for potential use
window.searchPosts = searchPosts;
window.loadNewsFeed = loadNewsFeed;
window.closePopup = closePopup;
