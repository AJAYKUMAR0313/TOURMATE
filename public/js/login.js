/* eslint-disable no-undef */

import { showAlert, hideAlert } from './alerts';
export const login = async (email, password) => {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/v1/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.status === 'success') {
      showAlert('success', 'logged in successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    } else {
      showAlert('error', data.message || 'Incorrect email ID or password');
    }
  } catch (err) {
    // console.log('hello')
    showAlert('error', 'An error occurred. Please try again.');
    console.log(err);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
    });
    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert('err', 'Error logging out! try again');
  }
};
// document.querySelector('.form').addEventListener('submit', (e) => {
//   e.preventDefault();
//   const email = document.getElementById('email').value;
//   const password = document.getElementById('password').value;
//   login(email, password);
// });

// const login = async (email, password) => {
//   try {
//     console.log(email, password);
//     const res = await axios({
//       method: 'POST',
//       url: 'https://127.0.0.1:3000/api/v1/users/login',
//       data: {
//         email,
//         password,
//       },
//     });
//     console.log(res);
//   } catch (err) {
//     console.log(err.response.data);
//   }
// };
// document.querySelector('.form').addEventListener('submit', (e) => {
//   e.preventDefault();
//   const email = document.getElementById('email').value;
//   const password = document.getElementById('password').value;
//   login(email, password);
// });
