/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './src/components/App.jsx';

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
