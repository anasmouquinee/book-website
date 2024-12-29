/*=============== UTILITIES ===============*/
class DOMUtils {
  static getElement(selector, required = true) {
      const element = document.querySelector(selector);
      if (!element && required) {
          throw new Error(`Element ${selector} not found`);
      }
      return element;
  }

  static getAllElements(selector) {
      return [...document.querySelectorAll(selector)];
  }

  static showMessage(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
  }
}

/*=============== AUTH CONTROLLER ===============*/
class AuthController {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.initializeAdmin();
}

generateRecoveryCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

signup(userData) {
    if (!userData.email || !userData.password || !userData.name) {
        throw new Error('All fields are required');
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.some(user => user.email === userData.email)) {
        throw new Error('Email already registered');
    }

    // Generate recovery code
    const recoveryCode = this.generateRecoveryCode();
    
    // recovery code
    users.push({
        ...userData,
        recoveryCode
    });
    
    localStorage.setItem('users', JSON.stringify(users));
    return recoveryCode; // Return code to show to user
}
resetPassword(email, recoveryCode, newPassword) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => 
        u.email === email && 
        u.recoveryCode === recoveryCode
    );

    if (userIndex === -1) {
        throw new Error('Invalid email or recovery code');
    }

    // Update password
    users[userIndex].password = newPassword;
    // Generate new recovery code
    users[userIndex].recoveryCode = this.generateRecoveryCode();
    
    localStorage.setItem('users', JSON.stringify(users));
    return users[userIndex].recoveryCode; // Return new code
}
  initializeAdmin() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const adminExists = users.some(user => user.isAdmin);
    
    if (!adminExists) {
        users.push({
            name: 'Admin',
            email: 'anasmouquine2@gmail.com',
            password: 'anasanas',
            isAdmin: true
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
}
  login(credentials) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => 
          u.email === credentials.email && 
          u.password === credentials.password
      );

      if (!user) throw new Error('Invalid credentials');
      
      this.currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
  }

  logout() {
      this.currentUser = null;
      localStorage.removeItem('currentUser');
  }
  updatePassword(currentPassword, newPassword) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === this.currentUser.email);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Verify current password
    if (users[userIndex].password !== currentPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    users[userIndex].password = newPassword;
    localStorage.setItem('users', JSON.stringify(users));
    
    // Update current user
    this.currentUser = users[userIndex];
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
  }
}

/*=============== CART CONTROLLER ===============*/
class CartController {
  constructor() {
      this.items = JSON.parse(localStorage.getItem('cart') || '[]');
  }

  addItem(item) {
      const existingItem = this.items.find(i => i.id === item.id);
      if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1;
      } else {
          this.items.push({ ...item, quantity: 1 });
      }
      this.saveCart();
      DOMUtils.showMessage('Item added to cart', 'success');
  }

  removeItem(itemId) {
      this.items = this.items.filter(item => item.id !== itemId);
      this.saveCart();
  }

  getTotal() {
      return this.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  }

  saveCart() {
      localStorage.setItem('cart', JSON.stringify(this.items));
  }
  removeFromCart(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    this.saveCart();
}
}

/*=============== UI CONTROLLER ===============*/
class UIController {
    constructor() {
        this.DEFAULT_BOOK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsQAAA7EB9YPtSQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAL5SURBVHic7d0/iBxlHMfxz+/2FEUURRRBBCsrQYV0aaKFnXZpLBQE0cLOQtBCsBLUQhC0ULAQtEqlEBHBQkguVVI8JI1/IEFQFPz3vp+12Sf3srkke8/u7Ozs8nm/YLmd3Wd3f8/3O7M7OzsDSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZK0PKZNPdigL3VSrOBVovhEXPrS+rVnOmlaq9DB8vcAHwEPdtF0H/gy4KkUMm26OehBcI0YH2Dl5QUtkN9T4IEUON1k0z0IrkV8HQxvuhv4KspzMR1vsmm5IdJVngwGyqVX1wKHUsis7lsY0CceBQbMhUBDZkAgSYPAYJcWU7A/wv0anD5kdOooHPkLzp9bqs0OA14BOklwOILbGO1rkEfh/Ck4/Bt0MsFThAbC1QDJ6wDA4RG8EXBLm9ptwdEZuO8kvLUKN7WpXQYMeBkAuLuB9lIKLJb1Nqjrzbl1dTjaOeAcJM8BwxbwQoIz69WbagWObiP5HED9kQHDZEAgGRAkAwLVPFk1tIA8Qe0BFYDh5IxHgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZEKhQrxCqBk3gqRnMlmsEpzGuD7iQAkfWeP6lkFvXdg64eJXb/l8urX/7AuVVwmfA+RQ4uwa3rsNbKTBZh1fXYXsdfoDFr+0csJ4CD6TAWArsTYG7UuDMBK6fwK+Ay66up73oyL4U+CPG0El8c/6VXf3a7gHHUuDnVbiQHV/bfeBjVoGfRnDnJfilvI7w8wQeicD3MyuBHc45oJu13QfeYwIfJzift62VcwD1mQGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQBgTKgEAZECgDAmVAoAwIlAGBMiBQ/wI8C1tnOfj4WAAAAABJRU5ErkJggg=='; // Basic book icon in base64

        this.initializeControllers();
        this.initializeElements();
        this.initializeBooks();
        this.initializeEventListeners();
        this.initializeTheme();
        this.updateAuthUI();
        this.updateBookDisplays();
        this.initializeSwipers(); // Ensure Swiper is initialized
    }

    initializeSwipers() {
        new Swiper('.featured__swiper', {
            loop: true,
            spaceBetween: 16,
            slidesPerView: 'auto',
            centeredSlides: true,
            grabCursor: true,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            }
        });
    }
// Add this method to your UIController class
handleSearch(e) {
    e.preventDefault();
    const query = this.searchInput.value.toLowerCase().trim();
    const books = JSON.parse(localStorage.getItem('books') || '[]');
    
    // Filter books based on query
    const results = books.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.description.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query)
    );

    // Get search results container
    const searchResults = DOMUtils.getElement('.search__results');
    
    // Update UI with results
    if (query === '') {
        searchResults.innerHTML = `
            <div class="search__empty">
                <i class="ri-search-line"></i>
                <p>Type something to search</p>
            </div>
        `;
        return;
    }

    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="search__empty">
                <i class="ri-error-warning-line"></i>
                <p>No results found</p>
            </div>
        `;
        return;
    }

    searchResults.innerHTML = `
        <div class="search__grid">
            ${results.map(book => `
                <article class="search__card" onclick="app.showBookDetails('${book.id}')">
                    <img src="${book.image}" alt="${book.title}" class="search__img">
                    <div class="search__data">
                        <h3 class="search__title">${book.title}</h3>
                        <span class="search__genre">${book.genre}</span>
                        <span class="search__price">$${book.discountPrice || book.price}</span>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}
    updateBookDisplays() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        
        // Map books with default image fallback
        const booksWithImages = books.map(book => ({
            ...book,
            image: book.image || this.DEFAULT_BOOK_IMAGE
        }));
        
        this.updateFeaturedBooks(booksWithImages);
        this.updateNewBooks(booksWithImages);
    }
    
    updateFeaturedBooks(books) {
        const container = document.getElementById('featured-books');
        if (!container) return;
    
        container.innerHTML = books.map(book => `
            <article class="featured__card swiper-slide">
                <img src="${book.image}" alt="${book.title}" class="featured__img">
                <h2 class="featured__title">${book.title}</h2>
                <div class="featured__prices">
                    ${book.discountPrice ? 
                        `<span class="featured__discount">$${book.discountPrice}</span>
                         <span class="featured__price">$${book.price}</span>` :
                        `<span class="featured__discount">$${book.price}</span>`
                    }
                </div>
                <button class="button add-to-cart" 
                        data-book-id="${book.id}"
                        data-book-title="${book.title}"
                        data-book-price="${book.discountPrice || book.price}">
                    Add To Cart
                </button>
                <div class="featured__actions">
                    <button onclick="app.showBookDetails('${book.id}')">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="add-to-wishlist" data-book-id="${book.id}">
                        <i class="ri-heart-3-line"></i>
                    </button>
                </div>
            </article>
        `).join('');
    
        // Reinitialize Swiper
        this.initializeSwipers();
    }

    updateFeaturedBooks(books) {
        const container = document.getElementById('featured-books');
        if (!container) return;

        container.innerHTML = books.map(book => `
            <article class="featured__card swiper-slide">
                <img src="${book.image}" alt="${book.title}" class="featured__img">
                <h2 class="featured__title">${book.title}</h2>
                <div class="featured__prices">
                    ${book.discountPrice ? 
                        `<span class="featured__discount">$${book.discountPrice}</span>
                         <span class="featured__price">$${book.price}</span>` :
                        `<span class="featured__discount">$${book.price}</span>`
                    }
                </div>
                <button class="button add-to-cart" 
                        data-book-id="${book.id}"
                        data-book-title="${book.title}"
                        data-book-price="${book.discountPrice || book.price}">
                    Add To Cart
                </button>
                <div class="featured__actions">
                    <button onclick="app.showBookDetails('${book.id}')">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="add-to-wishlist" data-book-id="${book.id}">
                        <i class="ri-heart-3-line"></i>
                    </button>
                </div>
            </article>
        `).join('');

        // Reinitialize Swiper
        this.initializeSwipers();
    }

updateNewBooks(books) {
    const container = document.getElementById('new-books');
    if (!container) return;

    // Sort by date to get newest books
    const newBooks = [...books].sort((a, b) => 
        new Date(b.addedDate) - new Date(a.addedDate)
    ).slice(0, 10);

    container.innerHTML = newBooks.map(book => `
        <a href="#" class="new__card swiper-slide" onclick="app.showBookDetails('${book.id}'); return false;">
            <img src="${book.image}" alt="${book.title}" class="new__img">
            <div>
                <h2 class="new__title">${book.title}</h2>
                <div class="new__prices">
                    ${book.discountPrice ? 
                        `<span class="new__discount">$${book.discountPrice}</span>
                         <span class="new__price">$${book.price}</span>` :
                        `<span class="new__discount">$${book.price}</span>`
                    }
                </div>
                <div class="new__stars">
                    <i class="ri-star-fill"></i>
                    <i class="ri-star-fill"></i>
                    <i class="ri-star-fill"></i>
                    <i class="ri-star-fill"></i>
                    <i class="ri-star-half-fill"></i>
                </div>
            </div>
        </a>
    `).join('');

    // Reinitialize Swiper
    new Swiper('.new__swiper', {
        loop: true,
        spaceBetween: 16,
        slidesPerView: 'auto'
    });
}
updateFeaturedBooks(books) {
    const container = document.getElementById('featured-books');
    if (!container) {
        console.error('Featured books container not found');
        return;
    }
    console.log('Books to display:', books); // Debug log
    // Rest of your code...
}
showBookDetails(bookId) {
    const books = JSON.parse(localStorage.getItem('books') || '[]');
    const book = books.find(b => b.id === bookId);
    
    if (!book) return;

    const modal = document.createElement('div');
    modal.className = 'book-details-modal';
    modal.innerHTML = `
        <div class="book-details__content">
            <img src="${book.image}" alt="${book.title}" class="book-details__img">
            <h2 class="book-details__title">${book.title}</h2>
            <span class="book-details__genre">${book.genre || 'General'}</span>
            <p class="book-details__description">${book.description || 'No description available.'}</p>
            <div class="book-details__prices">
                ${book.discountPrice ? 
                    `<span class="book-details__discount">$${book.discountPrice}</span>
                     <span class="book-details__price">$${book.price}</span>` :
                    `<span class="book-details__price">$${book.price}</span>`
                }
            </div>
            <button class="button add-to-cart"
                    data-book-id="${book.id}"
                    data-book-title="${book.title}"
                    data-book-price="${book.discountPrice || book.price}">
                Add To Cart
            </button>
            <i class="ri-close-line book-details__close"></i>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Add close handler
    modal.querySelector('.book-details__close').onclick = () => {
        modal.remove();
    };

    // Add to recently viewed
    this.addToRecentlyViewed(book);
    this.updateRecentlyViewed();
}

updateRecentlyViewed() {
    const container = document.getElementById('history-content');
    if (!container) return;

    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const historyList = container.querySelector('.profile__history');

    if (recentlyViewed.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <i class="ri-history-line"></i>
                <p>No recently viewed items</p>
            </div>
        `;
    } else {
        historyList.innerHTML = recentlyViewed.map(book => `
            <div class="history-item">
                <img src="${book.image}" alt="${book.title}" class="history-item__img">
                <div class="history-item__info">
                    <h3 class="history-item__title">${book.title}</h3>
                    <span class="history-item__price">$${book.discountPrice || book.price}</span>
                    <span class="history-item__date">Viewed: ${new Date(book.viewedAt).toLocaleDateString()}</span>
                </div>
                <button class="button" onclick="app.showBookDetails('${book.id}')">
                    <i class="ri-eye-line"></i>
                </button>
            </div>
        `).join('');
    }
}

addToRecentlyViewed(book) {
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const existingIndex = recentlyViewed.findIndex(b => b.id === book.id);
    
    if (existingIndex !== -1) {
        recentlyViewed.splice(existingIndex, 1);
    }
    
    recentlyViewed.unshift({
        ...book,
        viewedAt: new Date().toISOString()
    });

    // Keep only last 10 items
    if (recentlyViewed.length > 10) {
        recentlyViewed.pop();
    }

    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
}

switchProfileTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    // Get all tabs and contents safely
    const allTabs = Array.from(document.querySelectorAll('.profile__tab'));
    const allContents = Array.from(document.querySelectorAll('.profile__content'));
    
    if (!allTabs.length || !allContents.length) {
        console.warn('No tabs or content found');
        return;
    }
    
    // Remove active class from all tabs and contents
    allTabs.forEach(tab => {
        tab.classList?.remove('active');
        const content = document.getElementById(`${tab.dataset.tab}-content`);
        if (content) {
            content.classList.remove('active');
            content.classList.remove('fade-in');
        }
    });

    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(`${tabId}-content`);
    
    if (selectedTab && selectedContent) {
        selectedTab.classList.add('active');
        selectedContent.classList.add('active', 'fade-in');
        
        // Load books if admin tab
        if (tabId === 'admin') {
            this.loadBooks();
        }
    }
}
initializeAdminFeatures() {
    console.log('Setting up admin event listeners'); // Debug log
    
    // Add Book button handler
    const addBookBtn = document.querySelector('.admin__add-book');
    if (addBookBtn) {
        addBookBtn.addEventListener('click', () => {
            console.log('Add book clicked'); // Debug log
            this.showBookForm();
        });
    } else {
        console.warn('Add book button not found');
    }

    // Book form submission handler
    const bookForm = document.getElementById('book-form');
    if (bookForm) {
        bookForm.addEventListener('submit', (e) => {
            console.log('Book form submitted'); // Debug log
            e.preventDefault();
            this.handleBookSubmit(e);
        });
    } else {
        console.warn('Book form not found');
    }

    // Cancel button handler
    const cancelBtn = document.getElementById('cancel-book');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('Cancel button clicked'); // Debug log
            this.hideBookForm();
        });
    } else {
        console.warn('Cancel button not found');
    }

    // Load existing books
    this.loadBooks();
}

hideAllModals() {
  const modals = ['login', 'signup', 'profile', 'book-form'];
  modals.forEach(type => {
      const modal = document.getElementById(`${type}-content`) || 
                   document.getElementById(`${type}-modal`);
      if (modal) {
          modal.classList.remove(`show-${type}`);
          modal.classList.remove('show-modal');
      }
  });
}
showBookForm(bookData = null) {
    const modal = document.getElementById('book-form-modal');
    const form = document.getElementById('book-form');
    
    if (bookData) {
        // Fill form for editing
        form.elements['book-title'].value = bookData.title;
        form.elements['book-price'].value = bookData.price;
        form.elements['book-discount'].value = bookData.discountPrice;
        form.elements['book-description'].value = bookData.description;
        form.dataset.editId = bookData.id;
    } else {
        form.reset();
        delete form.dataset.editId;
    }
    
    modal.classList.add('show-modal');
}

hideBookForm() {
    document.getElementById('book-form-modal').classList.remove('show-modal');
}

async handleBookSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    // Get existing books or initialize empty array
    let books = JSON.parse(localStorage.getItem('books') || '[]');
    
    // Handle image upload
    const imageFile = form.elements['book-image'].files[0];
    const imageUrl = await this.handleImageUpload(imageFile);
    
    const bookData = {
        id: form.dataset.editId || Date.now().toString(),
        title: form.elements['book-title'].value,
        genre: form.elements['book-genre'].value,
        price: parseFloat(form.elements['book-price'].value),
        discountPrice: parseFloat(form.elements['book-discount'].value) || null,
        description: form.elements['book-description'].value,
        image: imageUrl,
        addedDate: new Date().toISOString()
    };

    if (form.dataset.editId) {
        // Update existing book
        const index = books.findIndex(b => b.id === form.dataset.editId);
        books[index] = { ...books[index], ...bookData };
    } else {
        // Add new book
        books.push(bookData);
    }

    // Save to localStorage
    localStorage.setItem('books', JSON.stringify(books));
    
    // Update UI
    this.hideBookForm();
    this.loadBooks();
    this.updateBookDisplays(); // Update all book displays
    DOMUtils.showMessage('Book saved successfully', 'success');
}

async handleImageUpload(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result); // Store image as base64
        };
        reader.readAsDataURL(file);
    });
}

loadBooks() {
    console.log('Loading books'); // Debug log
    const books = JSON.parse(localStorage.getItem('books') || '[]');
    const container = document.querySelector('.admin__book-list');
    
    if (!container) {
        console.warn('Book list container not found');
        return;
    }

    if (books.length === 0) {
        container.innerHTML = '<p class="admin__no-books">No books added yet</p>';
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="admin__book-item">
            <img src="${book.image}" alt="${book.title}" class="admin__book-cover">
            <div class="admin__book-info">
                <h3 class="admin__book-title">${book.title}</h3>
                <span class="admin__book-genre">${book.genre}</span>
                <div class="admin__book-price">
                    ${book.discountPrice ? 
                        `<span class="discount">$${book.discountPrice}</span> ` : 
                        ''}
                    <span class="price">$${book.price}</span>
                </div>
                <p class="admin__book-desc">${book.description}</p>
            </div>
            <div class="admin__book-actions">
                <button class="button" onclick="app.editBook('${book.id}')">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="button button--ghost" onclick="app.deleteBook('${book.id}')">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Update other book displays
    this.updateBookDisplays();
}

editBook(bookId) {
    const books = JSON.parse(localStorage.getItem('books') || '[]');
    const book = books.find(b => b.id === bookId);
    if (book) {
        this.showBookForm(book);
    }
}

deleteBook(bookId) {
    if (confirm('Are you sure you want to delete this book?')) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const filtered = books.filter(b => b.id !== bookId);
        localStorage.setItem('books', JSON.stringify(filtered));
        this.loadBooks();
        this.updateBookDisplays(); 
        DOMUtils.showMessage('Book deleted successfully', 'success');
    }
}
initializeBooks() {
    const books = JSON.parse(localStorage.getItem('books') || '[]');
    if (books.length === 0) {
        // Add default books
        const defaultBooks = [
            {
                id: '1',
                title: 'The Perfect Book',
                genre: 'Fiction',
                price: 29.99,
                discountPrice: 14.99,
                description: 'A sample book description',
                image: 'assets/img/book-1.png',
                addedDate: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Mystery Novel',
                genre: 'Mystery',
                price: 34.99,
                discountPrice: 19.99,
                description: 'Another sample book description',
                image: 'assets/img/book-2.png',
                addedDate: new Date().toISOString()
            }
        ];
        localStorage.setItem('books', JSON.stringify(defaultBooks));
    }
    this.updateBookDisplays();
}


  initializeControllers() {
      this.auth = new AuthController();
      this.cart = new CartController();
  }

  initializeElements() {
      // Core elements
      this.header = DOMUtils.getElement('#header');
      this.themeButton = DOMUtils.getElement('#theme-button');
      // Search elements
      this.searchButton = DOMUtils.getElement('#search-button');
      this.searchContent = DOMUtils.getElement('#search-content');
      this.searchClose = DOMUtils.getElement('#search-close');
      this.searchForm = DOMUtils.getElement('.search__form');
      this.searchInput = DOMUtils.getElement('.search__input');
  
      // Auth elements
      this.loginButton = DOMUtils.getElement('#login-button');
      this.loginContent = DOMUtils.getElement('#login-content');
      this.loginForm = DOMUtils.getElement('.login__form');
      this.loginClose = DOMUtils.getElement('#login-close');

      // Signup elements
      this.signupContent = DOMUtils.getElement('#signup-content');
      this.signupForm = DOMUtils.getElement('.signup__form');
      this.signupClose = DOMUtils.getElement('#signup-close');
      this.showSignupLink = DOMUtils.getElement('#show-signup');

      // Cart elements
      this.cartButton = DOMUtils.getElement('#cart-button', false);
      this.cartContent = DOMUtils.getElement('#cart-content', false);

      // Profile elements
      this.profileContent = DOMUtils.getElement('#profile-content', false);
      this.profileTabs = DOMUtils.getAllElements('.profile__tab');
  }

  initializeEventListeners() {
    //pass handler
    const passwordForm = document.querySelector('.profile__password-form');
    passwordForm?.addEventListener('submit', (e) => this.handlePasswordUpdate(e));
      // Auth listeners
      this.loginForm?.addEventListener('submit', e => this.handleLogin(e));
      this.signupForm?.addEventListener('submit', e => this.handleSignup(e));
             // Search listeners
             this.searchButton?.addEventListener('click', () => this.showModal('search'));
             this.searchClose?.addEventListener('click', () => this.hideModal('search'));
             this.searchForm?.addEventListener('submit', (e) => this.handleSearch(e));
             this.searchInput?.addEventListener('input', (e) => this.handleSearch(e));
         
      // Modal close listeners
      this.loginClose?.addEventListener('click', () => this.hideModal('login'));
      this.signupClose?.addEventListener('click', () => this.hideModal('signup'));
          // Profile tab switching
    this.profileTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            this.switchProfileTab(tabId); 
        });
    });
    document.addEventListener('click', e => {
        if (e.target.matches('.cart-item__remove') || e.target.closest('.cart-item__remove')) {
            const cartItem = e.target.closest('.cart-item');
            const itemId = cartItem.dataset.itemId;
            
            if (confirm('Remove this item from cart?')) {
                this.cart.removeFromCart(itemId);
                this.updateCartUI();
                DOMUtils.showMessage('Item removed from cart', 'info');
            }
        }
    });
    document.getElementById('show-recovery')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideModal('login');
        this.showModal('recovery');
    });

    document.querySelector('.recovery__form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePasswordReset(e);
    });
    document.querySelector('.switch-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideModal('signup');
        this.showModal('login');
    });

    document.querySelector('#show-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideModal('login');
        this.showModal('signup');
    });

    // Add profile close handler
    document.querySelector('.profile__close')?.addEventListener('click', () => {
        document.querySelector('#profile-content').classList.remove('show-profile');
    });

    // Add logout handler
    document.querySelector('.profile__logout')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            this.auth.logout();
            document.querySelector('#profile-content').classList.remove('show-profile');
            this.updateAuthUI();
            DOMUtils.showMessage('Logged out successfully', 'info');
        }
    });
    document.querySelector('.recovery__close')?.addEventListener('click', () => {
        this.hideModal('recovery');
    });
}

async handlePasswordReset(e) {
    try {
        const email = DOMUtils.getElement('#recovery-email').value;
        const code = DOMUtils.getElement('#recovery-code').value;
        const newPassword = DOMUtils.getElement('#recovery-new-pass').value;

        const newCode = await this.auth.resetPassword(email, code, newPassword);
        
        alert(`Your password has been reset.\nYour new recovery code is: ${newCode}`);
        
        this.hideModal('recovery');
        this.showModal('login');
        DOMUtils.showMessage('Password reset successful', 'success');
    } catch (error) {
        DOMUtils.showMessage(error.message, 'error');
    }
    document.addEventListener('click', e => {
        // Handle add to cart
        if (e.target.matches('.add-to-cart')) {
            const { bookId, bookTitle, bookPrice } = e.target.dataset;
            this.cart.addItem({
                id: bookId,
                title: bookTitle,
                price: parseFloat(bookPrice)
            });
            this.updateCartUI();
        }

        // Handle book details
        if (e.target.matches('.featured__actions button') || 
            e.target.matches('.new__card')) {
            const bookId = e.target.closest('[data-book-id]')?.dataset.bookId;
            if (bookId) {
                e.preventDefault();
                this.showBookDetails(bookId);
            }
        }
    });

    document.getElementById('admin-close')?.addEventListener('click', () => {
        document.getElementById('admin-panel').classList.remove('show-panel');
        this.loginButton.innerHTML = `<i class="ri-user-line"></i>`;
        this.loginButton.onclick = () => this.showModal('login');
    });

    // Add escape key handler for admin panel
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.auth.currentUser?.isAdmin) {
            document.getElementById('admin-panel').classList.remove('show-panel');
        }
    });

        // Add admin nav link handler
        document.getElementById('admin-nav-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.auth.currentUser?.isAdmin) {
                document.getElementById('profile-content').classList.add('show-profile');
                this.switchProfileTab('admin');
            }
        });
    
        document.getElementById('book-image')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('image-preview');
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });

      // Form toggle listeners
      this.showSignupLink?.addEventListener('click', e => {
          e.preventDefault();
          this.hideModal('login');
          this.showModal('signup');
      });
      // Add logout handler
      const logoutBtn = document.getElementById('profile-logout');
      logoutBtn?.addEventListener('click', () => {
          if (confirm('Are you sure you want to logout?')) {
              this.auth.logout();
              this.updateAuthUI();
              this.hideModal('profile');
              DOMUtils.showMessage('Logged out successfully', 'info');
          }
      });
            // Add profile close button handler
      const profileClose = DOMUtils.getElement('#profile-close', false);
      profileClose?.addEventListener('click', () => {
          this.hideModal('profile');
      });

      // Update global escape key handler
      document.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
              // Close all modals
              this.hideModal('login');
              this.hideModal('signup');
              this.hideModal('profile');
          }
      });

      // Theme toggle
      this.themeButton?.addEventListener('click', () => this.toggleTheme());

      // Cart actions
      document.addEventListener('click', e => this.handleCartActions(e));

      // Profile actions
      this.profileTabs?.forEach(tab => {
          tab.addEventListener('click', () => this.switchProfileTab(tab));
      });

      // Global escape key handler
      document.addEventListener('keydown', e => {
          if (e.key === 'Escape') this.hideAllModals();
      });
  }
  async handleLogin(e) {
    e.preventDefault();
    try {
        const email = DOMUtils.getElement('#login-email').value;
        const password = DOMUtils.getElement('#login-pass').value;
        
        const user = await this.auth.login({ email, password });
        
        if (user.isAdmin) {
            // If admin, show admin panel immediately
            document.getElementById('admin-panel').classList.add('show-panel');
            this.initializeAdminFeatures();
        } else {
            // For regular users, show profile
            document.getElementById('profile-content').classList.add('show-profile');
        }
        
        this.updateAuthUI();
        DOMUtils.showMessage('Login successful', 'success');
        
        e.target.reset();
        this.hideModal('login');
    } catch (error) {
        DOMUtils.showMessage(error.message, 'error');
    }
}
async handlePasswordUpdate(e) {
    e.preventDefault();
    
    const currentPass = document.getElementById('current-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    try {
      // Validate passwords
      if (!currentPass || !newPass || !confirmPass) {
        throw new Error('All fields are required');
      }

      if (newPass !== confirmPass) {
        throw new Error('New passwords do not match');
      }

      if (newPass.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Update password
      await this.auth.updatePassword(currentPass, newPass);
      
      // Clear form
      e.target.reset();
      
      DOMUtils.showMessage('Password updated successfully', 'success');
    } catch (error) {
      DOMUtils.showMessage(error.message, 'error');
    }
  }
  async handleSignup(e) {
        e.preventDefault();
        try {
            const userData = {
                name: DOMUtils.getElement('#signup-name').value,
                email: DOMUtils.getElement('#signup-email').value,
                password: DOMUtils.getElement('#signup-pass').value
            };
            
            const recoveryCode = this.auth.signup(userData);
            
            alert(`Please save this recovery code: ${recoveryCode}\nYou will need it to reset your password if you forget it.`);
            
            DOMUtils.showMessage('Signup successful! Please login.', 'success');
            e.target.reset();
            this.hideModal('signup');
            this.showModal('login');
        } catch (error) {
            DOMUtils.showMessage(error.message, 'error');
        }
  }

  handleCartActions(e) {
      if (e.target.matches('.add-to-cart')) {
          if (!this.auth.currentUser) {
              DOMUtils.showMessage('Please login to add items to cart', 'error');
              return;
          }

          const bookId = e.target.dataset.bookId;
          const bookTitle = e.target.dataset.bookTitle;
          const bookPrice = parseFloat(e.target.dataset.bookPrice);
          
          this.cart.addItem({ id: bookId, title: bookTitle, price: bookPrice });
          this.updateCartUI();
      }

      if (e.target.matches('.cart-item__remove')) {
          const itemId = e.target.dataset.id;
          this.cart.removeItem(itemId);
          this.updateCartUI();
      }
  }


  updateAuthUI() {
    if (!this.loginButton) return;

    const user = this.auth.currentUser;
    if (user) {
        // Update login button
        this.loginButton.innerHTML = `<i class="ri-user-line"></i> ${user.name}`;
        this.loginButton.onclick = () => {
            // Show profile
            document.getElementById('profile-content').classList.add('show-profile');
            
            // Update profile info fields
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            
            if (profileName && profileEmail) {
                profileName.value = user.name;
                profileEmail.value = user.email;
            }

            // Show admin panel if admin
            if (user.isAdmin) {
                document.getElementById('admin-panel').classList.add('show-panel');
                if (!this.adminInitialized) {
                    this.initializeAdminFeatures();
                    this.adminInitialized = true;
                }
            }
        };
    } else {
        this.loginButton.innerHTML = `<i class="ri-user-line"></i>`;
        this.loginButton.onclick = () => this.showModal('login');
    }
}

// Add a method to update profile info
updateProfileInfo() {
    const user = this.auth.currentUser;
    if (user) {
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        
        if (profileName && profileEmail) {
            profileName.value = user.name;
            profileEmail.value = user.email;
        }
    }
}

// Update handleLogin to include profile info update




initializeAdminFeatures() {
    // Add admin event listeners
    document.querySelector('.admin__add-book')?.addEventListener('click', () => {
        this.showBookForm();
    });

    document.getElementById('book-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleBookSubmit(e);
    });

    document.getElementById('cancel-book')?.addEventListener('click', () => {
        this.hideBookForm();
    });

    // Load existing books
    this.loadBooks();
}

  handleLogout() {
      if (confirm('Do you want to logout?')) {
          this.auth.logout();
          this.updateAuthUI();
          DOMUtils.showMessage('Logged out successfully', 'info');
      }
  }

  updateCartUI() {
    const cartList = this.cartContent?.querySelector('.profile__cart');
    if (!cartList) return;

    if (this.cart.items.length === 0) {
        cartList.innerHTML = `
            <div class="cart-empty">
                <i class="ri-shopping-cart-line"></i>
                <p>Your cart is empty</p>
            </div>
            <div class="cart-total">
                <span>Total:</span>
                <span class="cart__total">$0.00</span>
            </div>
        `;
    } else {
        cartList.innerHTML = `
            ${this.cart.items.map(item => `
                <div class="cart-item" data-item-id="${item.id}">
                    <img src="${item.image || 'assets/img/default-book.png'}" alt="${item.title}" class="cart-item__img">
                    <div class="cart-item__info">
                        <h3 class="cart-item__title">${item.title}</h3>
                        <span class="cart-item__price">$${item.price}</span>
                        <span class="cart-item__quantity">Quantity: ${item.quantity || 1}</span>
                    </div>
                    <button class="cart-item__remove">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `).join('')}
            <div class="cart-total">
                <span>Total:</span>
                <span class="cart__total">$${this.cart.getTotal().toFixed(2)}</span>
            </div>
        `;
    }
}

  switchProfileTab(clickedTab) {
      this.profileTabs.forEach(tab => {
          tab.classList.remove('active');
          DOMUtils.getElement(`#${tab.dataset.tab}-content`).classList.remove('active');
      });

      clickedTab.classList.add('active');
      DOMUtils.getElement(`#${clickedTab.dataset.tab}-content`).classList.add('active');
  }

  showModal(type) {
      const modal = DOMUtils.getElement(`#${type}-content`);
      modal.classList.add(`show-${type}`);
  }

  hideModal(type) {
      const modal = DOMUtils.getElement(`#${type}-content`);
      modal.classList.remove(`show-${type}`);
  }

  hideAllModals() {
      ['login', 'signup', 'profile'].forEach(type => {
          const modal = document.querySelector(`#${type}-content`);
          if (modal) modal.classList.remove(`show-${type}`);
      });
  }

  toggleTheme() {
      document.body.classList.toggle('dark-theme');
      this.themeButton.classList.toggle('ri-sun-line');
      this.themeButton.classList.toggle('ri-moon-line');
      
      const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      localStorage.setItem('selected-theme', theme);
  }

  initializeTheme() {
    const themeButton = document.getElementById('theme-button');
    const darkTheme = 'dark-theme';
    const iconTheme = 'ri-sun-line';
    const selectedTheme = localStorage.getItem('selected-theme');
    const selectedIcon = localStorage.getItem('selected-icon');
    const getCurrentTheme = () => document.body.classList.contains(darkTheme) ? 'dark' : 'light';
    const getCurrentIcon = () => themeButton.classList.contains(iconTheme) ? 'ri-moon-line' : 'ri-sun-line';

    if (selectedTheme) {
        document.body.classList[selectedTheme === 'dark' ? 'add' : 'remove'](darkTheme);
        themeButton.classList[selectedIcon === 'ri-sun-line' ? 'add' : 'remove'](iconTheme);
    }
    themeButton?.addEventListener('click', () => {
        document.body.classList.toggle(darkTheme);
        themeButton.classList.toggle(iconTheme);
        
        localStorage.setItem('selected-theme', getCurrentTheme());
        localStorage.setItem('selected-icon', getCurrentIcon());
    });
}
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  try {
      window.app = new UIController();
      console.log('Application initialized successfully');
  } catch (error) {
      console.error('Initialization failed:', error);
      DOMUtils.showMessage('Failed to initialize application', 'error');
  }
});

// Add toast styles
const style = document.createElement('style');
style.textContent = `
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 4px;
  color: white;
  z-index: 1000;
  animation: slideIn 0.3s, fadeOut 0.3s 2.7s;
}
.toast--success { background-color: #4caf50; }
.toast--error { background-color: #f44336; }
.toast--info { background-color: #2196f3; }

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}`;
document.head.appendChild(style);