// Import the necessary Firebase services
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const passwordPopup = document.getElementById('passwordPopup');
    const submitPasswordButton = document.getElementById('submitPassword');
    const mainContent = document.getElementById('mainContent');
    const chartTab = document.getElementById('chartTab');
    const accessTab = document.getElementById('accessTab');
    const chartSection = document.getElementById('chartSection');
    const accessControlSection = document.getElementById('accessControlSection');
    const passwordError = document.getElementById('passwordError');
    const dishesListAccess = document.getElementById('dishesListAccess'); // Accessing the element here
    const searchBar = document.getElementById('searchBar');
    const clearSearchButton = document.getElementById('clearSearch');
    const noResultsContainer = document.getElementById('noResultsContainer');
    const noResultsImage = document.getElementById('noResultsImage');
    const passwordInput = document.getElementById('password');
    const numberInput = document.getElementById('inputNumber');
    const savedContainer = document.getElementById('saveContainer');
    const validateButton = document.getElementById('validateButton');

    let sessionTime = 30 * 60 * 1000; // 30 minutes in milliseconds
    let password = '12'; // Example password
    const sessionExpiration = localStorage.getItem('sessionExpiration');
    const currentTime = new Date().getTime();

    // Function to show the main content
    function showMainContent() {
        mainContent.style.display = 'block';
    }

    // Check if session has expired
    if (sessionExpiration && currentTime < sessionExpiration) {
        // Session is still valid; show the main content
        console.log("Session is valid. Showing main content.");
        showMainContent();
    } else {
        // Session expired or not set; show the password popup
        console.log("Session expired or not set. Showing password popup.");
        passwordPopup.style.display = 'flex';
    }

    // Handle password submission via button click
    submitPasswordButton.addEventListener('click', submitPassword);

    // Handle password submission via 'Enter' key press
    passwordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            submitPassword();
        }
    });

        // Set up session timeout handling
    let sessionExpired = false; // Flag to track if session has already expired

    setInterval(() => {
        const storedExpirationTime = localStorage.getItem('sessionExpiration');
        const currentTime = new Date().getTime(); // Get current time inside the interval

        // If the session has expired and hasn't been handled yet
        if (storedExpirationTime && currentTime > storedExpirationTime && !sessionExpired) {
            sessionExpired = true; // Set the flag to true to avoid repeated alerts
            Swal.fire({
                title: 'Session Timeout',
                text: 'Your session has expired. Please log in again.',
                icon: 'warning',
                confirmButtonText: 'OK'
            }).then((result) => {
                localStorage.removeItem('sessionExpiration'); // Clear session on timeout
                location.reload(); // Reload the page to prompt for the password again
            });
        }
    }, 1000);


    // Tab navigation
    chartTab.addEventListener('click', () => {
        chartTab.classList.add('active');
        accessTab.classList.remove('active');
        chartSection.style.display = 'block';
        accessControlSection.style.display = 'none';
    });

    accessTab.addEventListener('click', () => {
        accessTab.classList.add('active');
        chartTab.classList.remove('active');
        chartSection.style.display = 'none';
        accessControlSection.style.display = 'block';
        get_credentials().then(credentials => {  // Return the promise here
        try {
            const firebaseConfig = {
                apiKey: decrypt_values(credentials.API_KEY, credentials.KEY),
                authDomain: decrypt_values(credentials.AUTH_DOMAIN, credentials.KEY),
                projectId: decrypt_values(credentials.ID, credentials.KEY),
                storageBucket: decrypt_values(credentials.STORAGE_BUCKET, credentials.KEY),
                messagingSenderId: decrypt_values(credentials.MESSAGING_SENDER_ID, credentials.KEY),
                appId: decrypt_values(credentials.APP_ID, credentials.KEY),
                measurementId: decrypt_values(credentials.MEASUREMENT_ID, credentials.KEY)
            };
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            getDocs(collection(db, decrypt_values(credentials.DB_NAME, credentials.KEY))) // Return this promise
                .then(querySnapshot => {
                    querySnapshot.forEach(doc => {
                    if (doc.data().whatsapp_no !== undefined) {
                        localStorage.setItem('whatsapp_no', doc.data().whatsapp_no);
                    }
                    if (doc.data().disabled_items !== undefined) {
                        localStorage.setItem('disable_item_ids', doc.data().disabled_items);
                    }
                });
            });
        } catch (e){
             Swal.fire({
                title: 'Connection Error',
                text: 'Please connect with developer.',
                icon: 'error',
                confirmButtonText: 'OK'
             }).then((result) => {
                location.reload(); // Reload the page to prompt for the password again
             });
        }
        });
        loadAccessControlData(); // Load data when Access Control tab is clicked
    });

    // Load access control data from external JSON file
    function loadAccessControlData() {
        fetch('../data.json') // Ensure the path to your JSON file is correct
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load data');
                }
                return response.json();
            })
            .then(data => {
                numberInput.value = localStorage.getItem('whatsapp_no').slice(3)
                renderDishes(data); // Call the function to render dishes
            })
            .catch(error => {
                console.error('Error loading access control data:', error);
                Swal.fire('Error', 'Could not load access control data.', 'error');
            });
    }

    // Render dishes function
    function renderDishes(menuData) {
    dishesListAccess.innerHTML = ''; // Clear existing content

    // Retrieve disabled item IDs from localStorage
    let disable_items = JSON.parse(localStorage.getItem('disable_item_ids')) || [];
    let copy_disable_items = [];
    if(disable_items){
        copy_disable_items = disable_items.slice();
    }

    menuData.menu.forEach(category => {
        category.subcategories.forEach(subcategory => {
            // Create subcategory title
            const subcategoryTitle = document.createElement('h4');
            subcategoryTitle.textContent = `${subcategory.name} (${subcategory.type})`;
            dishesListAccess.appendChild(subcategoryTitle);

            subcategory.dishes.forEach(dish => {
                const dishElement = document.createElement('div');
                dishElement.classList.add('dish-item');

                // Check if dish is in disable_items and set the toggle accordingly
                const isDisabled = disable_items.includes(dish.id);

                dishElement.innerHTML = `
                    <span>${dish.name} - ₹${dish.price}</span>
                    <label class="switch">
                        <input type="checkbox" id="toggle-${dish.id}" ${isDisabled ? '' : 'checked'}>
                        <span class="slider round"></span>
                    </label>
                `;

                dishesListAccess.appendChild(dishElement);

                // Add event listener to toggle button to update localStorage
                const toggleButton = dishElement.querySelector(`#toggle-${dish.id}`);
                toggleButton.addEventListener('change', function () {
                    if (toggleButton.checked) {
                        // Remove dish ID from disable_items if unchecked
                        disable_items = disable_items.filter(id => id !== dish.id);
                    } else {
                        // Add dish ID to disable_items if unchecked
                        if (!disable_items.includes(dish.id)) {
                            disable_items.push(dish.id);
                        }
                    }

                    // Update disable_item_ids in localStorage
                    localStorage.setItem('disable_item_ids', JSON.stringify(disable_items));
                    
                    // Show submit button if any changes
                    const updated_disable_items = JSON.parse(localStorage.getItem('disable_item_ids'))
                    console.log(updated_disable_items, copy_disable_items)
                    if(updated_disable_items.every(element => copy_disable_items.includes(element)) && copy_disable_items.every(element => updated_disable_items.includes(element))){
                        savedContainer.style.display = 'none';
                    }else{
                        savedContainer.style.display = 'inline-grid';
                    }
                });
            });
        });
    });
}

    // Search functionality
    searchBar.addEventListener('input', function () {
        const searchTerm = searchBar.value.toLowerCase(); // Get the search term
        const dishItems = dishesListAccess.getElementsByClassName('dish-item'); // Get all dish items
        const subcategoryTitles = dishesListAccess.getElementsByTagName('h4'); // Get all subcategory titles
    
        let anyVisibleDish = false; // Flag to track if any dish is visible
    
        // Iterate through each subcategory title
        Array.from(subcategoryTitles).forEach(subcategoryTitle => {
            const subcategoryName = subcategoryTitle.textContent.toLowerCase(); // Get subcategory name
    
            // Get the related dish items by finding the next sibling elements until the next subcategory title
            let relatedDishItems = [];
            let nextSibling = subcategoryTitle.nextElementSibling;
            while (nextSibling && nextSibling.tagName !== 'H4') {
                if (nextSibling.classList.contains('dish-item')) {
                    relatedDishItems.push(nextSibling);
                }
                nextSibling = nextSibling.nextElementSibling;
            }
    
            let subcategoryMatch = false;
    
            // If the search term matches the subcategory name, show all related dishes
            if (subcategoryName.includes(searchTerm)) {
                subcategoryMatch = true;
                relatedDishItems.forEach(dishItem => {
                    dishItem.style.display = ''; // Show all dishes of the subcategory
                });
                anyVisibleDish = true; // Set flag to true since we matched a subcategory
                subcategoryTitle.style.display = ''; // Show subcategory title
            } else {
                // Initially hide the subcategory title until we check individual dishes
                subcategoryTitle.style.display = 'none';
            }
    
            // Iterate through each related dish item for individual dish name match
            relatedDishItems.forEach(dishItem => {
                const dishName = dishItem.querySelector('span').textContent.toLowerCase(); // Get dish name
    
                // If the search term matches the dish name, show the dish
                if (dishName.includes(searchTerm)) {
                    dishItem.style.display = ''; // Show item if name matches
                    subcategoryTitle.style.display = ''; // Ensure subcategory title is visible
                    anyVisibleDish = true; // Set flag to true since we matched a dish
                } else if (!subcategoryMatch) {
                    // Hide the dish if it doesn't match and no subcategory match
                    dishItem.style.display = 'none';
                }
            });
    
            // Show or hide the subcategory title based on whether it or any of its dishes are visible
            const hasVisibleDishes = relatedDishItems.some(item => item.style.display !== 'none');
            if (hasVisibleDishes) {
                subcategoryTitle.style.display = ''; // Show subcategory title if any dish is visible
            }
        });
    
        // Show or hide no results message based on whether any dish is visible
        if (anyVisibleDish) {
            noResultsContainer.style.display = 'none'; // Hide the no results image
        } else {
            noResultsContainer.style.display = 'block'; // Show the no results image
        }
    
        // Scroll to the top position of the search bar
        const searchBarRect = searchBar.getBoundingClientRect(); // Get the position of the search bar
        window.scrollTo({
            top: searchBarRect.top + window.scrollY - 10, // Adjust for current scroll position
            behavior: 'smooth' // Smooth scroll
        });
    
        // Show or hide clear button based on search input
        clearSearchButton.style.display = searchTerm ? 'block' : 'none'; // Show or hide the clear button based on the input
    });
    

    // Clear search functionality
    clearSearchButton.addEventListener('click', function () {
        searchBar.value = ''; // Clear the search bar value
        clearSearchButton.style.display = 'none'; // Hide clear button
        // Reset visibility of all dishes and subcategory titles
        Array.from(dishesListAccess.getElementsByClassName('dish-item')).forEach(dishItem => {
            dishItem.style.display = ''; // Show all items
        });
        // Show all subcategory titles
        Array.from(dishesListAccess.getElementsByTagName('h4')).forEach(subcategoryTitle => {
            subcategoryTitle.style.display = ''; // Show all subcategory titles
        });
    });

    function submitPassword() {
        const enteredPassword = passwordInput.value;
        if (enteredPassword === password) {
            // Set the session expiration time (30 minutes from now)
            const expirationTime = currentTime + sessionTime;
            localStorage.setItem('sessionExpiration', expirationTime);
            location.reload();
            passwordPopup.style.display = 'none';
        } else {
            passwordError.textContent = 'Incorrect password, please try again.';
        }
    }

    // Add an event listener for the 'input' event to capture each key press
    numberInput.addEventListener('input', function() {
        const savedNumber = localStorage.getItem('whatsapp_no').slice(3)
        console.log(numberInput.value, savedNumber); // Logs the current value of the input field
        if(numberInput.value === savedNumber){
            savedContainer.style.display = 'none';
            validateButton.style.display = 'none';
        }else{
            savedContainer.style.display = 'inline-grid';
            validateButton.style.display = 'block';
        }
    });

});

async function get_credentials() {
    try {
        // Fetch the JSON file
        const response = await fetch('../credentials.json');

        // Check if the fetch was successful
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        // Parse the JSON data
        const data = await response.json();

        return data; // Return the data
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        return null; // Return null or handle the error as needed
    }
}

function decrypt_values(value, key){
    const decryptedBytes = CryptoJS.AES.decrypt(value, key);
    return decryptedBytes.toString(CryptoJS.enc.Utf8);
}