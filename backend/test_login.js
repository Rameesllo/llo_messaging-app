const axios = require('axios');

const test = async () => {
    try {
        console.log('Testing login endpoint...');
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            identifier: 'yasir',
            password: 'password123' // I'll guess a common password or use one from the DB
        });
        console.log('Login successful:', res.data);
    } catch (err) {
        console.error('Login failed!');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error MESSAGE:', err.message);
        }
    }
};

test();
