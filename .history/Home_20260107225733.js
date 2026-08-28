// Simple Scroll Effect for Navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.padding = '10px 8%';
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
    } else {
        navbar.style.padding = '20px 8%';
        navbar.style.background = '#fff';
    }
});

// Login Button Interaction
const loginBtn = document.getElementById('loginBtn');
loginBtn.addEventListener('click', () => {
    alert('Redirecting to Login Page...');
    // In a real app, use: window.location.href = 'login.html';
});

// Dynamic Greeting based on time (Optional UI touch)
const heroPara = document.querySelector('.hero-content p');
const hours = new Date().getHours();
let greeting = "Connecting blood donors with those in need.";

if (hours < 12) greeting = "Start your morning by saving a life. " + greeting;
else if (hours < 18) greeting = "Make your afternoon meaningful. " + greeting;

// We won't overwrite the whole para, just prepend if you like
console.log("System Ready: Welcome to LifeLine Blood Management");