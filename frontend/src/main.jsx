import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SuggestionsPage from './pages/SuggestionsPage.jsx';
import ManagePage from './pages/ManagePage.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />
        <Route path="/manage/:token" element={<ManagePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
