import '@babel/polyfill';
import { displayMap } from './leaflet';
import { login } from './login';
import { logout } from './login';

//DOM elements
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form');
const logOutBtn = document.querySelector('.nav__el--logout');
//VALUES

//DELEGATION
if (mapBox) {
  const locationsData = JSON.parse(mapBox.dataset.locations);
  displayMap(locationsData);
}
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    e.preventDefault();
    login(email, password);
  });
}

if (logOutBtn) {
  logOutBtn.addEventListener('click', logout);
}
