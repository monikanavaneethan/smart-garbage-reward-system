import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [pointsToAdd, setPointsToAdd] = useState(0);
    const [rewards, setRewards] = useState([]);
    const [rewardId, setRewardId] = useState('');

    useEffect(() => {
        if (token) {
            fetchRewards();
        }
    }, [token]);

    const register = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/register', { username, email, password });
            setToken(res.data.token);
            alert('Registered successfully!');
        } catch (err) {
            console.error('Registration error:', err.response.data);
        }
    };

    const login = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/login', { email, password });
            setToken(res.data.token);
            setUser(res.data.user);
            alert('Logged in successfully!');
        } catch (err) {
            console.error('Login error:', err.response.data);
        }
    };

    const getProfile = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/profile', {
                headers: { 'x-auth-token': token }
            });
            setUser(res.data);
        } catch (err) {
            console.error('Profile error:', err.response.data);
        }
    };

    const scanGarbage = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/scan', {
                userId: user._id,
                points: pointsToAdd
            });
            setUser({ ...user, points: res.data.points });
            alert('Points added successfully!');
        } catch (err) {
            console.error('Scan error:', err.response.data);
        }
    };

    const fetchRewards = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/rewards');
            setRewards(res.data);
        } catch (err) {
            console.error('Fetch rewards error:',
